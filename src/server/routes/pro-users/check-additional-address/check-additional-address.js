import { get, post, removeLatest } from './controller.js'
import { app, validate } from './options.js'

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
            app
          }
        },
        {
          method: 'POST',
          path: '/check-additional-address',
          ...post,
          options: {
            app,
            validate
          }
        },
        {
          method: 'POST',
          path: '/check-additional-address/remove',
          ...removeLatest
        }
      ])
    }
  }
}
