import { get, post } from './controller.js'
import { app, validate } from './options.js'
import { NO_STORE_CACHE } from '#/server/common/constants/cache-control.js'
import { ADDRESS_SEARCH_PAGE } from '#/server/common/constants/address-pages.js'

export const businessAddress = {
  plugin: {
    name: 'businessAddress',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: ADDRESS_SEARCH_PAGE,
          ...get,
          options: {
            cache: NO_STORE_CACHE,
            app
          }
        },
        {
          method: 'POST',
          path: ADDRESS_SEARCH_PAGE,
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
