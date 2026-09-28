import { requireAuthorised } from '@defra/hapi-oidc-auth'

import { searchController } from './controller.js'
import { app, validate } from './options.js'

// Enforcement-officer / admin search of the register by reference (EQ-227).
// Sits behind the case-officer Entra auth (requireAuthorised → role case_officer).
export const search = {
  plugin: {
    name: 'search',
    register(server) {
      server.route({
        method: 'GET',
        path: '/search',
        ...searchController,
        options: {
          app,
          validate,
          pre: [{ method: requireAuthorised }]
        }
      })
    }
  }
}
