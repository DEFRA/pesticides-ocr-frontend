import { milestonePageCache } from '#/server/common/constants/analytics-events.js'
import { get } from './controller.js'
import { app } from './options.js'

export const notEligible = {
  plugin: {
    name: 'notEligible',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/not-eligible',
          ...get,
          options: {
            app,
            cache: milestonePageCache
          }
        }
      ])
    }
  }
}
