import { get, post } from './controller.js'
import { app, validate } from './options.js'

export const quantity = {
  plugin: {
    name: 'quantity',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/quantity',
          ...get,
          options: {
            app
          }
        },
        {
          method: 'POST',
          path: '/quantity',
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
