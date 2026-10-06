import { get, post } from './controller.js'
import { app, validate } from './options.js'

export const addressActivity = {
  plugin: {
    name: 'addressActivity',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/address-activity',
          ...get,
          options: {
            app
          }
        },
        {
          method: 'POST',
          path: '/address-activity',
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
