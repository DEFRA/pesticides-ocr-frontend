import { get, post } from './controller.js'
import { app, validate } from './options.js'

export const additionalBusinessContact = {
  plugin: {
    name: 'additionalBusinessContact',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/additional-addresses/contact',
          ...get,
          options: {
            app
          }
        },
        {
          method: 'POST',
          path: '/additional-addresses/contact',
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
