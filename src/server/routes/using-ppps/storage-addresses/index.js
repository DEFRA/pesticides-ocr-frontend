import { get, post, remove } from './controller.js'
import { app, removeValidate, validate } from './options.js'
import { NO_STORE_CACHE } from '#/server/common/constants/cache-control.js'
import { STORAGE_ADDRESSES_PAGE } from '#/server/common/helpers/journey.js'

export const storageAddresses = {
  plugin: {
    name: 'storageAddresses',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: STORAGE_ADDRESSES_PAGE,
          ...get,
          options: {
            cache: NO_STORE_CACHE,
            app
          }
        },
        {
          method: 'POST',
          path: STORAGE_ADDRESSES_PAGE,
          ...post,
          options: {
            cache: NO_STORE_CACHE,
            app,
            validate
          }
        },
        {
          // Removing changes the answers, so it's a POST from a button on the card.
          method: 'POST',
          path: `${STORAGE_ADDRESSES_PAGE}/remove`,
          ...remove,
          options: {
            cache: NO_STORE_CACHE,
            app,
            validate: removeValidate
          }
        }
      ])
    }
  }
}
