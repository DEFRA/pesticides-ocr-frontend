import { requireAuthorised } from '@defra/hapi-oidc-auth'

import { operatorsController, operatorsExportController } from './controller.js'
import { app } from './options.js'

// Enforcement-officer / admin view of registered operators (EQ-227). Both routes
// sit behind the case-officer Entra auth (requireAuthorised → role case_officer).
export const adminOperators = {
  plugin: {
    name: 'admin-operators',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/admin/operators',
          ...operatorsController,
          options: {
            app,
            pre: [{ method: requireAuthorised }]
          }
        },
        {
          method: 'GET',
          path: '/admin/operators/export',
          ...operatorsExportController,
          options: {
            app,
            pre: [{ method: requireAuthorised }]
          }
        }
      ])
    }
  }
}
