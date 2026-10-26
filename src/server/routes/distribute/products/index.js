import { get, post } from './controller.js'
import { app, validate } from './options.js'
import { NO_STORE_CACHE } from '#/server/common/constants/cache-control.js'
import { DISTRIBUTE_PRODUCTS_PAGE } from '#/server/common/helpers/journey.js'

export const distributeProducts = {
  plugin: {
    name: 'distributeProducts',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: DISTRIBUTE_PRODUCTS_PAGE,
          ...get,
          options: {
            cache: NO_STORE_CACHE,
            app
          }
        },
        {
          method: 'POST',
          path: DISTRIBUTE_PRODUCTS_PAGE,
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
