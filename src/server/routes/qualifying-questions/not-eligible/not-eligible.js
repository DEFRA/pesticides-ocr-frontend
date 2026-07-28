import { get } from './controller.js'

export const notEligible = {
  plugin: {
    name: 'notEligible',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/not-eligible',
          ...get
        }
      ])
    }
  }
}
