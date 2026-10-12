import { get, post } from './controller.js'
import { app, validate } from './options.js'

export const mainCustomer = {
  plugin: {
    name: 'mainCustomer',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/main-customer',
          ...get,
          options: {
            app
          }
        },
        {
          method: 'POST',
          path: '/main-customer',
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
