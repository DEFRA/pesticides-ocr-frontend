import { get, post } from './controller.js'
import { app, validate } from './options.js'

export const businessActivities = {
  plugin: {
    name: 'businessActivities',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/business-activities',
          ...get,
          options: {
            app
          }
        },
        {
          method: 'POST',
          path: '/business-activities',
          ...post,
          options: {
            app,
            validate
          }
        }
      ])
    }
  }
}
