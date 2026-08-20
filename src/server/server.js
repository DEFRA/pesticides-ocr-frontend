import path from 'node:path'
import hapi from '@hapi/hapi'
import Scooter from '@hapi/scooter'

import { router } from './plugins/router.js'
import { config } from '#/config/config.js'
import { pulse } from './plugins/pulse.js'
import { catchAll } from './common/helpers/errors.js'
import { nunjucksConfig } from '#/config/nunjucks/nunjucks.js'
import { requestTracing } from './plugins/request-tracing.js'
import { requestLogger } from './plugins/request-logger.js'
import { sessionCache } from './plugins/session-cache.js'
import { getCacheEngine } from './common/helpers/session-cache/cache-engine.js'
import { secureContext } from '@defra/hapi-secure-context'
import { contentSecurityPolicy } from './plugins/content-security-policy.js'
import { metrics } from '@defra/cdp-metrics'
import { hapiOidcAuth } from '@defra/hapi-oidc-auth'
import { applyMockIdentity } from './common/helpers/mock-identity.js'

// In mock mode, normalise the signed-in demo identity to the configured display
// name so the header and the account page agree (see mock-identity.js). No-op in
// live mode, where the real Entra identity is authoritative.
function registerMockIdentity(server) {
  if (config.get('entra.mode') !== 'mock') {
    return
  }
  const mockDisplayName = config.get('entra.mockDisplayName')
  server.ext('onPostAuth', (request, h) => {
    applyMockIdentity(request, mockDisplayName)
    return h.continue
  })
}

export async function createServer() {
  const server = hapi.server({
    host: config.get('host'),
    port: config.get('port'),
    routes: {
      validate: {
        options: {
          abortEarly: false
        }
      },
      files: {
        relativeTo: path.resolve(config.get('root'), '.public')
      },
      security: {
        hsts: {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: false
        },
        xss: 'enabled',
        noSniff: true,
        xframe: true
      }
    },
    router: {
      stripTrailingSlash: true
    },
    cache: [
      {
        name: config.get('session.cache.name'),
        engine: getCacheEngine(config.get('session.cache.engine'))
      }
    ],
    state: {
      strictHeader: false
    }
  })
  await server.register([
    requestLogger,
    requestTracing,
    metrics,
    secureContext,
    pulse,
    sessionCache,
    nunjucksConfig,
    Scooter,
    contentSecurityPolicy,
    // Case-officer (HSE/Defra staff) sign-in via Microsoft Entra ID. Registered
    // after sessionCache (@hapi/yar) and nunjucksConfig (@hapi/vision) since it
    // relies on both. The applicant register journey stays unauthenticated.
    {
      plugin: hapiOidcAuth,
      options: {
        entra: {
          mode: config.get('entra.mode'),
          tenantId: config.get('entra.tenantId'),
          clientId: config.get('entra.clientId'),
          clientSecret: config.get('entra.clientSecret'),
          publicBaseUrl: config.get('entra.publicBaseUrl'),
          redirectPath: config.get('entra.redirectPath'),
          signOutRedirectUrl: config.get('entra.signOutRedirectUrl'),
          roleValues: config.get('entra.roleValues')
        },
        redirects: {
          postLogin: config.get('entra.postLoginRedirect'),
          signOut: config.get('entra.postSignOutRedirect')
        }
      }
    },
    router // Register all the controllers/routes defined in src/server/router.js
  ])

  registerMockIdentity(server)

  server.ext('onPreResponse', catchAll)

  return server
}
