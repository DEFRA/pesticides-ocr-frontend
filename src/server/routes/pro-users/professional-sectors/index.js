import { get, post } from './controller.js'
import { app, validate } from './options.js'
import { NO_STORE_CACHE } from '#/server/common/constants/cache-control.js'

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
            cache: NO_STORE_CACHE,
            app
          }
        },
        {
          method: 'POST',
          path: '/professional-sectors',
          ...post,
          options: {
            cache: NO_STORE_CACHE,
            app,
            validate
          }
        }
      ])
    }
  }
}
