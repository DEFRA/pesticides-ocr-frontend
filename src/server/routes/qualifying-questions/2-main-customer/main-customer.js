import { get, post } from './controller.js'
import { options } from './options.js'

export const mainCustomer = {
  plugin: {
    name: 'mainCustomer',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/main-customer',
          ...get
        },
        {
          method: 'POST',
          path: '/main-customer',
          ...post,
          ...options
        }
      ])
    }
  }
}
