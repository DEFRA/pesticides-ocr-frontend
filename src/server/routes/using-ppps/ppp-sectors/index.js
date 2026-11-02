import { get, post } from './controller.js'
import { app, validate } from './options.js'
import { NO_STORE_CACHE } from '#/server/common/constants/cache-control.js'
import { PPP_SECTORS_PAGE } from '#/server/common/helpers/journey.js'

export const pppSectors = {
  plugin: {
    name: 'pppSectors',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: PPP_SECTORS_PAGE,
          ...get,
          options: {
            cache: NO_STORE_CACHE,
            app
          }
        },
        {
          method: 'POST',
          path: PPP_SECTORS_PAGE,
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
