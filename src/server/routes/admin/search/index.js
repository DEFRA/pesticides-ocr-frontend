import { requireAuthorised } from '@defra/hapi-oidc-auth'
import { get, post } from './controller.js'
import { app, validate } from './options.js'

export const search = {
  plugin: {
    name: 'search',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/admin/search',
          ...get,
          options: {
            app,
            pre: [{ method: requireAuthorised }]
          }
        },
        {
          method: 'POST',
          path: '/admin/search',
          ...post,
          options: {
            app,
            validate,
            pre: [{ method: requireAuthorised }]
          }
        }
      ])
    }
  }
}
