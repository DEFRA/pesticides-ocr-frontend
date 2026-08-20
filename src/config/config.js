import convict from 'convict'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

import convictFormatWithValidator from 'convict-format-with-validator'

const devSessionCookiePassword = crypto.randomBytes(32).toString('hex')

const dirname = path.dirname(fileURLToPath(import.meta.url))

const fourHoursMs = 14400000
const oneWeekMs = 604800000

const isProduction = process.env.NODE_ENV === 'production'
const isTest = process.env.NODE_ENV === 'test'
const isDevelopment = process.env.NODE_ENV === 'development'

convict.addFormats(convictFormatWithValidator)

export const config = convict({
  serviceVersion: {
    doc: 'The service version, this variable is injected into your docker container in CDP environments',
    format: String,
    nullable: true,
    default: null,
    env: 'SERVICE_VERSION'
  },
  host: {
    doc: 'The IP address to bind',
    format: 'ipaddress',
    default: '0.0.0.0',
    env: 'HOST'
  },
  port: {
    doc: 'The port to bind.',
    format: 'port',
    default: 3000,
    env: 'PORT'
  },
  staticCacheTimeout: {
    doc: 'Static cache timeout in milliseconds',
    format: Number,
    default: oneWeekMs,
    env: 'STATIC_CACHE_TIMEOUT'
  },
  serviceName: {
    doc: 'Applications Service Name',
    format: String,
    default: 'OCR Register'
  },
  root: {
    doc: 'Project root',
    format: String,
    default: path.resolve(dirname, '../..')
  },
  assetPath: {
    doc: 'Asset path',
    format: String,
    default: '/public',
    env: 'ASSET_PATH'
  },
  isProduction: {
    doc: 'If this application running in the production environment',
    format: Boolean,
    default: isProduction
  },
  isDevelopment: {
    doc: 'If this application running in the development environment',
    format: Boolean,
    default: isDevelopment
  },
  isTest: {
    doc: 'If this application running in the test environment',
    format: Boolean,
    default: isTest
  },
  log: {
    enabled: {
      doc: 'Is logging enabled',
      format: Boolean,
      default: process.env.NODE_ENV !== 'test',
      env: 'LOG_ENABLED'
    },
    level: {
      doc: 'Logging level',
      format: ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'],
      default: 'info',
      env: 'LOG_LEVEL'
    },
    format: {
      doc: 'Format to output logs in.',
      format: ['ecs', 'pino-pretty'],
      default: isProduction ? 'ecs' : 'pino-pretty',
      env: 'LOG_FORMAT'
    },
    redact: {
      doc: 'Log paths to redact',
      format: Array,
      default: isProduction
        ? ['req.headers.authorization', 'req.headers.cookie', 'res.headers']
        : [],
      env: 'LOG_REDACT'
    },
    httpRequests: {
      doc: 'Log HTTP requests',
      format: Boolean,
      default: isProduction,
      env: 'LOG_HTTP_REQUESTS'
    }
  },
  httpProxy: {
    doc: 'HTTP Proxy',
    format: String,
    nullable: true,
    default: null,
    env: 'HTTP_PROXY'
  },
  isSecureContextEnabled: {
    doc: 'Enable Secure Context',
    format: Boolean,
    default: isProduction,
    env: 'ENABLE_SECURE_CONTEXT'
  },
  session: {
    cache: {
      engine: {
        doc: 'backend cache is written to',
        format: ['redis', 'memory'],
        default: isProduction ? 'redis' : 'memory',
        env: 'SESSION_CACHE_ENGINE'
      },
      name: {
        doc: 'server side session cache name',
        format: String,
        default: 'session',
        env: 'SESSION_CACHE_NAME'
      },
      ttl: {
        doc: 'server side session cache ttl',
        format: Number,
        default: fourHoursMs,
        env: 'SESSION_CACHE_TTL'
      }
    },
    cookie: {
      ttl: {
        doc: 'Session cookie ttl',
        format: Number,
        default: fourHoursMs,
        env: 'SESSION_COOKIE_TTL'
      },
      password: {
        doc: 'session cookie password',
        format: (value) => {
          if (typeof value !== 'string' || value.length < 32) {
            throw new Error(
              'SESSION_COOKIE_PASSWORD must be at least 32 characters long'
            )
          }
        },
        default: isProduction ? '' : devSessionCookiePassword,
        env: 'SESSION_COOKIE_PASSWORD',
        sensitive: true
      },
      secure: {
        doc: 'set secure flag on cookie',
        format: Boolean,
        default: isProduction,
        env: 'SESSION_COOKIE_SECURE'
      }
    }
  },
  redis: {
    host: {
      doc: 'Redis cache host',
      format: String,
      default: '127.0.0.1',
      env: 'REDIS_HOST'
    },
    username: {
      doc: 'Redis cache username',
      format: String,
      default: '',
      env: 'REDIS_USERNAME'
    },
    password: {
      doc: 'Redis cache password',
      format: '*',
      default: '',
      sensitive: true,
      env: 'REDIS_PASSWORD'
    },
    keyPrefix: {
      doc: 'Redis cache key prefix name used to isolate the cached results across multiple clients',
      format: String,
      default: 'pesticides-ocr-frontend:',
      env: 'REDIS_KEY_PREFIX'
    },
    useSingleInstanceCache: {
      doc: 'Connect to a single instance of redis instead of a cluster.',
      format: Boolean,
      default: !isProduction,
      env: 'USE_SINGLE_INSTANCE_CACHE'
    },
    useTLS: {
      doc: 'Connect to redis using TLS',
      format: Boolean,
      default: isProduction,
      env: 'REDIS_TLS'
    }
  },
  nunjucks: {
    watch: {
      doc: 'Reload templates when they are changed.',
      format: Boolean,
      default: isDevelopment
    },
    noCache: {
      doc: 'Use a cache and recompile templates each time',
      format: Boolean,
      default: isDevelopment
    }
  },
  entra: {
    mode: {
      doc: 'Case-officer sign-in mode: mock (local demo identity) or live (Entra ID)',
      format: ['mock', 'live'],
      default: isProduction ? 'live' : 'mock',
      env: 'ENTRA_AUTH_MODE'
    },
    tenantId: {
      doc: 'Entra tenant (directory) id',
      format: String,
      default: '',
      env: 'ENTRA_TENANT_ID'
    },
    clientId: {
      doc: 'Entra application (client) id',
      format: String,
      default: '',
      env: 'ENTRA_CLIENT_ID'
    },
    clientSecret: {
      doc: 'Entra client secret (set via CDP Secrets, never committed)',
      format: String,
      default: '',
      env: 'ENTRA_CLIENT_SECRET',
      sensitive: true
    },
    publicBaseUrl: {
      doc: 'Public base URL for the OIDC redirect URI (required in live mode)',
      format: String,
      default: '',
      env: 'ENTRA_PUBLIC_BASE_URL'
    },
    redirectPath: {
      doc: 'OIDC callback path registered with Entra',
      format: String,
      default: '/auth/entra/callback',
      env: 'ENTRA_REDIRECT_PATH'
    },
    signOutRedirectUrl: {
      doc: 'Post-logout redirect URL registered with Entra',
      format: String,
      default: '/',
      env: 'ENTRA_SIGN_OUT_REDIRECT_URL'
    },
    roleValues: {
      doc: 'Entra app-role value(s) that grant case-officer access',
      format: String,
      default: 'case_officer',
      env: 'ENTRA_CASE_OFFICER_ROLE_VALUE'
    },
    postLoginRedirect: {
      doc: 'Where a signed-in case officer lands after sign-in',
      format: String,
      default: '/dashboard',
      env: 'ENTRA_POST_LOGIN_REDIRECT'
    },
    postSignOutRedirect: {
      doc: 'Where a user lands after signing out locally',
      format: String,
      default: '/',
      env: 'ENTRA_POST_SIGN_OUT_REDIRECT'
    },
    mockDisplayName: {
      doc: 'Display name for the mock case-officer identity (mock mode only, local demo / UCD)',
      format: String,
      default: 'Ulysses Alvarez',
      env: 'ENTRA_MOCK_DISPLAY_NAME'
    }
  },
  tracing: {
    header: {
      doc: 'Which header to track',
      format: String,
      default: 'x-cdp-request-id',
      env: 'TRACING_HEADER'
    }
  }
})

config.validate({ allowed: 'strict' })
