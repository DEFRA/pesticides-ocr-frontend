import { get, post } from './controller.js'
import { app, validate } from './options.js'
import { NO_STORE_CACHE } from '#/server/common/constants/cache-control.js'
import { STORE_SITES_PAGE } from '#/server/common/helpers/journey.js'

export const storeSites = {
  plugin: {
    name: 'storeSites',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: STORE_SITES_PAGE,
          ...get,
          options: {
            cache: NO_STORE_CACHE,
            app
          }
        },
        {
          method: 'POST',
          path: STORE_SITES_PAGE,
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
