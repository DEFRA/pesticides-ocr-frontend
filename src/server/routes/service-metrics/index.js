import { requireAuthorised } from '@defra/hapi-oidc-auth'

import { serviceMetricsController } from './controller.js'
import { app } from './options.js'

// Journey metrics for the service owner (EQ-472), in the case-officer area.
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
