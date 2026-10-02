import { requireAuthorised } from '@defra/hapi-oidc-auth'

import { caseOfficerSecurity } from '#/server/common/helpers/case-officer-pages.js'
import { searchController, exportController } from './controller.js'
import { app, cache, validate, validateExport } from './options.js'

// Enforcement-officer / admin search of the register (EQ-227, EQ-402), and the
// per-registration CSV export. Both sit behind the case-officer Entra auth
// (requireAuthorised → role case_officer).
export const search = {
  plugin: {
    name: 'search',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/search',
          ...searchController,
          options: {
            app,
            cache,
            security: caseOfficerSecurity,
            validate,
            pre: [{ method: requireAuthorised }]
          }
        },
        {
          method: 'GET',
          path: '/search/export',
          ...exportController,
          options: {
            app,
            cache,
            security: caseOfficerSecurity,
            validate: validateExport,
            pre: [{ method: requireAuthorised }]
          }
        }
      ])
    }
  }
}
