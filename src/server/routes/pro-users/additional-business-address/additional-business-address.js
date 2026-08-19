import { get, post } from './controller.js'
import { app, validate } from './options.js'

export const additionalBusinessAddress = {
  plugin: {
    name: 'additionalBusinessAddress',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/additional-addresses/address',
          ...get,
          options: {
            app
          }
        },
        {
          method: 'POST',
          path: '/additional-addresses/address',
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
