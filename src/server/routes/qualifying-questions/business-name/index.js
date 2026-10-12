import { get, post } from './controller.js'
import { app, validate } from './options.js'

export const businessName = {
  plugin: {
    name: 'businessName',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/business-name',
          ...get,
          options: {
            app
          }
        },
        {
          method: 'POST',
          path: '/business-name',
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
