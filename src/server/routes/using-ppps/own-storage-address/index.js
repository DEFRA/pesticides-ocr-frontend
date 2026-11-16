import { get, post } from './controller.js'
import { app, validate } from './options.js'
import { NO_STORE_CACHE } from '#/server/common/constants/cache-control.js'
import { OWN_STORAGE_ADDRESS_PAGE } from '#/server/common/helpers/journey.js'

export const ownStorageAddress = {
  plugin: {
    name: 'ownStorageAddress',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: OWN_STORAGE_ADDRESS_PAGE,
          ...get,
          options: {
            cache: NO_STORE_CACHE,
            app
          }
        },
        {
          method: 'POST',
          path: OWN_STORAGE_ADDRESS_PAGE,
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
