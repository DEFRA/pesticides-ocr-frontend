import { get, post } from './controller.js'
import { app, validate } from './options.js'

export const professionalSectors = {
  plugin: {
    name: 'professionalSectors',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/professional-sectors',
          ...get,
          options: {
            app
          }
        },
        {
          method: 'POST',
          path: '/professional-sectors',
          ...post,
          options: {
            app,
            validate
          }
        }
      ])
    }
  }
}
