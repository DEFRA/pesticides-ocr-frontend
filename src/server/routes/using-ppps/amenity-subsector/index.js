import { get, post } from './controller.js'
import { app, validate } from './options.js'
import { NO_STORE_CACHE } from '#/server/common/constants/cache-control.js'
import { AMENITY_SUBSECTOR_PAGE } from '#/server/common/helpers/journey.js'

export const amenitySubsectors = {
  plugin: {
    name: 'amenitySubsectors',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: AMENITY_SUBSECTOR_PAGE,
          ...get,
          options: {
            cache: NO_STORE_CACHE,
            app
          }
        },
        {
          method: 'POST',
          path: AMENITY_SUBSECTOR_PAGE,
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
