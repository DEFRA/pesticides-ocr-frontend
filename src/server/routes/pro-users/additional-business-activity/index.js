import { get, post } from './controller.js'
import { app, validate } from './options.js'

export const additionalBusinessActivity = {
  plugin: {
    name: 'additionalBusinessActivity',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/additional-addresses/activity',
          ...get,
          options: {
            app
          }
        },
        {
          method: 'POST',
          path: '/additional-addresses/activity',
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
