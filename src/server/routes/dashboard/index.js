import { requireAuthorised } from '@defra/hapi-oidc-auth'

import { dashboardController } from './controller.js'
import { app } from './options.js'

export const dashboard = {
  plugin: {
    name: 'dashboard',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/admin/dashboard',
          ...dashboardController,
          options: {
            app,
            pre: [{ method: requireAuthorised }]
          }
        }
      ])
    }
  }
}
