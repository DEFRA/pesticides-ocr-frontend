import { get, post } from './controller.js'
import { app, validate } from './options.js'

export const memberSchemes = {
  plugin: {
    name: 'memberSchemes',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/member-schemes',
          ...get,
          options: {
            app
          }
        },
        {
          method: 'POST',
          path: '/member-schemes',
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
