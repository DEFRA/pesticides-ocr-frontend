import { get } from './controller.js'

export const confirmation = {
  plugin: {
    name: 'confirmation',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/confirmation',
          ...get
        }
      ])
    }
  }
}
