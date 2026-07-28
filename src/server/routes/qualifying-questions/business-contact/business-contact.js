import { get, post } from './controller.js'
import { options } from './options.js'

export const businessContact = {
  plugin: {
    name: 'businessContact',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/business-contact',
          ...get
        },
        {
          method: 'POST',
          path: '/business-contact',
          ...post,
          ...options
        }
      ])
    }
  }
}
