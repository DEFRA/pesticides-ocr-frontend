import { get, post } from './controller.js'
import { app, validate } from './options.js'
import { INTERNATIONAL_ADDRESS_PAGE } from '#/server/common/constants/address-pages.js'
import { NO_STORE_CACHE } from '#/server/common/constants/cache-control.js'

export const businessAddressInternational = {
  plugin: {
    name: 'businessAddressInternational',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: INTERNATIONAL_ADDRESS_PAGE,
          ...get,
          options: {
            cache: NO_STORE_CACHE,
            app
          }
        },
        {
          method: 'POST',
          path: INTERNATIONAL_ADDRESS_PAGE,
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
