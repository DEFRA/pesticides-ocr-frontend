import { get, post } from './controller.js'
import { options } from './options.js'

export const businessActivities = {
  plugin: {
    name: 'businessActivities',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/business-activities',
          ...get
        },
        {
          method: 'POST',
          path: '/business-activities',
          ...post,
          ...options
        }
      ])
    }
  }
}
