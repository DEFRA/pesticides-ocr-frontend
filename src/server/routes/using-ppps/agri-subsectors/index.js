import { get, post } from './controller.js'
import { app, validate } from './options.js'
import { NO_STORE_CACHE } from '#/server/common/constants/cache-control.js'
import { AGRI_SUBSECTORS_PAGE } from '#/server/common/helpers/journey.js'

export const agriSubsectors = {
  plugin: {
    name: 'agriSubsectors',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: AGRI_SUBSECTORS_PAGE,
          ...get,
          options: {
            cache: NO_STORE_CACHE,
            app
          }
        },
        {
          method: 'POST',
          path: AGRI_SUBSECTORS_PAGE,
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
