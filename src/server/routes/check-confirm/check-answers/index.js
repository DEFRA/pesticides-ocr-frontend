import { deleteAdditionalAddress, get, post } from './controller.js'
import { app, deleteAdditionalAddressValidate, validate } from './options.js'
import { NO_STORE_CACHE } from '#/server/common/constants/cache-control.js'

export const checkAnswers = {
  plugin: {
    name: 'checkAnswers',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/check-answers',
          ...get,
          options: {
            cache: NO_STORE_CACHE,
            app
          }
        },
        {
          method: 'POST',
          path: '/check-answers',
          ...post,
          options: {
            cache: NO_STORE_CACHE,
            app,
            validate
          }
        },
        {
          method: 'GET',
          path: '/check-answers/additional-addresses/{number}/delete',
          ...deleteAdditionalAddress,
          options: {
            cache: NO_STORE_CACHE,
            validate: deleteAdditionalAddressValidate
          }
        }
      ])
    }
  }
}
