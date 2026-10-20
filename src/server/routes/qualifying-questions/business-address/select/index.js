import { get, post } from './controller.js'
import { app, validate } from './options.js'
import { ADDRESS_SELECT_PAGE } from '#/server/common/constants/address-pages.js'
import { NO_STORE_CACHE } from '#/server/common/constants/cache-control.js'

export const businessAddressSelect = {
  plugin: {
    name: 'businessAddressSelect',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: ADDRESS_SELECT_PAGE,
          ...get,
          options: {
            cache: NO_STORE_CACHE,
            app
          }
        },
        {
          method: 'POST',
          path: ADDRESS_SELECT_PAGE,
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
