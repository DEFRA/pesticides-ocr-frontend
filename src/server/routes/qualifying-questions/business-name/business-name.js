import { get, post } from './controller.js'
import { options } from './options.js'

export const businessName = {
  plugin: {
    name: 'businessName',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/business-name',
          ...get
        },
        {
          method: 'POST',
          path: '/business-name',
          ...post,
          ...options
        }
      ])
    }
  }
}
