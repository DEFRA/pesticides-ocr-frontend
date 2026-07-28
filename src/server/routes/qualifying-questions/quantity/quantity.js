import { get, post } from './controller.js'
import { options } from './options.js'

export const quantity = {
  plugin: {
    name: 'quantity',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/quantity',
          ...get
        },
        {
          method: 'POST',
          path: '/quantity',
          ...post,
          ...options
        }
      ])
    }
  }
}
