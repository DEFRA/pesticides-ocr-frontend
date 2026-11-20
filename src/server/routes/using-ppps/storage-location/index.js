import { get, post } from './controller.js'
import { app, validate } from './options.js'
import { NO_STORE_CACHE } from '#/server/common/constants/cache-control.js'
import { STORAGE_LOCATION_PAGE } from '#/server/common/helpers/journey.js'

export const storageLocation = {
  plugin: {
    name: 'storageLocation',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: STORAGE_LOCATION_PAGE,
          ...get,
          options: {
            cache: NO_STORE_CACHE,
            app
          }
        },
        {
          method: 'POST',
          path: STORAGE_LOCATION_PAGE,
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
