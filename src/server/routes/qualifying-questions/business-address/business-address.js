import { get, post } from './controller.js'
import { options } from './options.js'

export const businessAddress = {
  plugin: {
    name: 'businessAddress',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/business-address',
          ...get
        },
        {
          method: 'POST',
          path: '/business-address',
          ...post,
          ...options
        }
      ])
    }
  }
}
