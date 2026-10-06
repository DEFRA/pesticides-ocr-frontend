import { get, post, removeLatest } from './controller.js'
import { app, validate } from './options.js'
import { NO_STORE_CACHE } from '#/server/common/constants/cache-control.js'

export const checkAdditionalAddress = {
  plugin: {
    name: 'checkAdditionalAddress',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/check-additional-address',
          ...get,
          options: {
            cache: NO_STORE_CACHE,
            app
          }
        },
        {
          method: 'POST',
          path: '/check-additional-address',
          ...post,
          options: {
            cache: NO_STORE_CACHE,
            app,
            validate
          }
        },
        {
          method: 'GET',
          path: '/check-additional-address/remove',
          ...removeLatest
        }
      ])
    }
  }
}
