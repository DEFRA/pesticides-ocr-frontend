import { get, post } from './controller.js'
import { app, validate } from './options.js'

export const emailAddress = {
  plugin: {
    name: 'emailAddress',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/email-address',
          ...get,
          options: {
            app
          }
        },
        {
          method: 'POST',
          path: '/email-address',
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
