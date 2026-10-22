import { get, post } from './controller.js'
import { app, validate } from './options.js'
import { NO_STORE_CACHE } from '#/server/common/constants/cache-control.js'
import { PROCESSING_SITES_PAGE } from '#/server/common/helpers/journey.js'

export const processingSites = {
  plugin: {
    name: 'processingSites',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: PROCESSING_SITES_PAGE,
          ...get,
          options: {
            cache: NO_STORE_CACHE,
            app
          }
        },
        {
          method: 'POST',
          path: PROCESSING_SITES_PAGE,
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
