import { get, post } from './controller.js'
import { app, validate } from './options.js'
import { NO_STORE_CACHE } from '#/server/common/constants/cache-control.js'

export const additionalBusinessContact = {
  plugin: {
    name: 'additionalBusinessContact',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/additional-addresses/contact',
          ...get,
          options: {
            cache: NO_STORE_CACHE,
            app
          }
        },
        {
          method: 'POST',
          path: '/additional-addresses/contact',
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
