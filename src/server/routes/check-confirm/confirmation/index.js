import { get } from './controller.js'
import { app } from './options.js'

export const confirmation = {
  plugin: {
    name: 'confirmation',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/confirmation',
          ...get,
          options: {
            app
          }
        }
      ])
    }
  }
}
