import { get, post } from './controller.js'
import { app, validate } from './options.js'

export const businessAddress = {
  plugin: {
    name: 'businessAddress',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/business-address',
          ...get,
          options: {
            app
          }
        },
        {
          method: 'POST',
          path: '/business-address',
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
