import { get, post } from './controller.js'
import { app, validate } from './options.js'
import { NO_STORE_CACHE } from '#/server/common/constants/cache-control.js'

export const additionalBusinessActivity = {
  plugin: {
    name: 'additionalBusinessActivity',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/additional-addresses/activity',
          ...get,
          options: {
            cache: NO_STORE_CACHE,
            app
          }
        },
        {
          method: 'POST',
          path: '/additional-addresses/activity',
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
