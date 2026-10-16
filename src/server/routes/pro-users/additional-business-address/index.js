import { get, post } from './controller.js'
import { app, validate } from './options.js'
import { NO_STORE_CACHE } from '#/server/common/constants/cache-control.js'

export const additionalBusinessAddress = {
  plugin: {
    name: 'additionalBusinessAddress',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/additional-addresses/address',
          ...get,
          options: {
            cache: NO_STORE_CACHE,
            app
          }
        },
        {
          method: 'POST',
          path: '/additional-addresses/address',
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
