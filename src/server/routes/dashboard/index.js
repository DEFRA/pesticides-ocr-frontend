import { requireAuthorised } from '@defra/hapi-oidc-auth'

import { caseOfficerSecurity } from '#/server/common/helpers/case-officer-pages.js'
import { dashboardController } from './controller.js'
import { app } from './options.js'

// Protected case-officer area. `requireAuthorised` sends an unauthenticated
// visitor to the Entra sign-in and 404s a signed-in user without the configured
// case-officer role.
export const dashboard = {
  plugin: {
    name: 'dashboard',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/dashboard',
          ...dashboardController,
          options: {
            app,
            security: caseOfficerSecurity,
            pre: [{ method: requireAuthorised }]
          }
        }
      ])
    }
  }
}
