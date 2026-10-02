import { get, post, resend } from './controller.js'
import { app, validate } from './options.js'

export const verifyCode = {
  plugin: {
    name: 'verifyCode',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/email-address/code',
          ...get,
          options: {
            app
          }
        },
        {
          method: 'POST',
          path: '/email-address/code',
          ...post,
          options: {
            app,
            validate
          }
        },
        {
          method: 'POST',
          path: '/email-address/resend',
          ...resend,
          options: {
            app
          }
        }
      ])
    }
  }
}
