import { get, post, resend, RESEND_PATH } from './controller.js'
import { app } from './options.js'
import { NO_STORE_CACHE } from '#/server/common/constants/cache-control.js'
import { CHECK_YOUR_EMAIL_PAGE, requireVerifiedEmail } from '#/server/common/helpers/email-verification.js'

export const checkYourEmail = {
  plugin: {
    name: 'checkYourEmail',
    register(server) {
      // Applies to every route, so the rest of the journey waits for a
      // confirmed email address.
      server.ext('onPreHandler', requireVerifiedEmail)

      server.route([
        {
          method: 'GET',
          path: CHECK_YOUR_EMAIL_PAGE,
          ...get,
          options: {
            cache: NO_STORE_CACHE,
            app
          }
        },
        {
          method: 'POST',
          path: CHECK_YOUR_EMAIL_PAGE,
          ...post,
          options: {
            cache: NO_STORE_CACHE,
            app
          }
        },
        {
          method: 'POST',
          path: RESEND_PATH,
          ...resend,
          options: {
            cache: NO_STORE_CACHE,
            app
          }
        }
      ])
    }
  }
}
