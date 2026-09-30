import { get, post } from './controller.js'
import { app, validate } from './options.js'

export const additionalAddresses = {
  plugin: {
    name: 'additionalAddresses',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/additional-addresses',
          ...get,
          options: {
            app
          }
        },
        {
          method: 'POST',
          path: '/additional-addresses',
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
