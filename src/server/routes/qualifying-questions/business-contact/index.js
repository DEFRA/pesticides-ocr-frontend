import { get, post } from './controller.js'
import { app, validate } from './options.js'

export const businessContact = {
  plugin: {
    name: 'businessContact',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/business-contact',
          ...get,
          options: {
            app
          }
        },
        {
          method: 'POST',
          path: '/business-contact',
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
