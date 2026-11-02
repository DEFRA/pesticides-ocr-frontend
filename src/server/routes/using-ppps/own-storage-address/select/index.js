import { get, post } from './controller.js'
import { app, validate } from './options.js'
import { OWN_STORAGE_ADDRESS_SELECT_PAGE } from '#/server/common/helpers/journey.js'
import { NO_STORE_CACHE } from '#/server/common/constants/cache-control.js'

export const ownStorageAddressSelect = {
  plugin: {
    name: 'ownStorageAddressSelect',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: OWN_STORAGE_ADDRESS_SELECT_PAGE,
          ...get,
          options: {
            cache: NO_STORE_CACHE,
            app
          }
        },
        {
          method: 'POST',
          path: OWN_STORAGE_ADDRESS_SELECT_PAGE,
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
