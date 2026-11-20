import { get } from './controller.js'
import { app } from './options.js'
import { NO_STORE_CACHE } from '#/server/common/constants/cache-control.js'
import { VERIFY_EMAIL_PAGE } from '#/server/common/helpers/journey.js'

export const verifyEmail = {
  plugin: {
    name: 'verifyEmail',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: VERIFY_EMAIL_PAGE,
          ...get,
          options: {
            cache: NO_STORE_CACHE,
            app
          }
        }
      ])
    }
  }
}
