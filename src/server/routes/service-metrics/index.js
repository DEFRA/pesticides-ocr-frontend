import { requireAuthorised } from '@defra/hapi-oidc-auth'

import { serviceMetricsController } from './controller.js'
import { app } from './options.js'

export const serviceMetrics = {
  plugin: {
    name: 'service-metrics',
    register(server) {
      server.route({
        method: 'GET',
        path: '/dashboard/metrics',
        ...serviceMetricsController,
        options: {
          app,
          pre: [{ method: requireAuthorised }]
        }
      })
    }
  }
}
