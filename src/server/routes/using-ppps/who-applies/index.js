import { get, post } from './controller.js'
import { app, validate } from './options.js'
import { NO_STORE_CACHE } from '#/server/common/constants/cache-control.js'
import { WHO_APPLIES_PAGE } from '#/server/common/helpers/journey.js'

export const whoApplies = {
  plugin: {
    name: 'whoApplies',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: WHO_APPLIES_PAGE,
          ...get,
          options: {
            cache: NO_STORE_CACHE,
            app
          }
        },
        {
          method: 'POST',
          path: WHO_APPLIES_PAGE,
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
