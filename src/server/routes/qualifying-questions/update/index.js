import { get } from './controller.js'
import { app } from './options.js'
import { NO_STORE_CACHE } from '#/server/common/constants/cache-control.js'

export const update = {
  plugin: {
    name: 'update',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/update',
          ...get,
          options: {
            cache: NO_STORE_CACHE,
            app
          }
        }
      ])
    }
  }
}
