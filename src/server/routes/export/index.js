import { get } from './controller.js'

export const exports = {
  plugin: {
    name: 'export',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/admin/export',
          ...get
        }
      ])
    }
  }
}
