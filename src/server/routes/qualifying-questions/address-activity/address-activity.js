import { get, post } from './controller.js'
import { options } from './options.js'

export const addressActivity = {
  plugin: {
    name: 'addressActivity',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/address-activity',
          ...get
        },
        {
          method: 'POST',
          path: '/address-activity',
          ...post,
          ...options
        }
      ])
    }
  }
}
