import { get, post } from './controller.js'
import { options } from './options.js'
import { VERIFY_EMAIL_PAGE } from '#/server/common/helpers/email-verification.js'

export const verifyEmail = {
  plugin: {
    name: 'verifyEmail',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: VERIFY_EMAIL_PAGE,
          ...get,
          options
        },
        {
          method: 'POST',
          path: VERIFY_EMAIL_PAGE,
          ...post,
          options
        }
      ])
    }
  }
}
