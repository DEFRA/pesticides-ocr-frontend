import Joi from 'joi'
import { requireAuthorised } from '@defra/hapi-oidc-auth'

import { operatorsController, operatorsExportController } from './controller.js'
import { app } from './options.js'

const MAX_SEARCH_LENGTH = 100
const OPERATORS_PATH = '/admin/operators'
const OPERATORS_EXPORT_PATH = `${OPERATORS_PATH}/export`

// Bound the search query before it reaches the (future) backend API: a trimmed
// string, optional/empty allowed, capped length; unknown query params stripped.
// An invalid/oversized query falls back to the unfiltered list rather than a 400.
//
// NOTE: Hapi runs query validation (and this failAction) BEFORE route `pre`
// handlers, i.e. before `requireAuthorised`. So this must stay a side-effect-free
// unconditional local redirect only — never log/reflect the raw query or emit
// any operator data here, or it becomes a pre-auth information-disclosure path.
const validate = {
  query: Joi.object({
    search: Joi.string().trim().max(MAX_SEARCH_LENGTH).allow('').default('')
  }),
  options: { stripUnknown: true },
  failAction: (_request, h) => h.redirect(OPERATORS_PATH).takeover()
}

// Enforcement-officer / admin view of registered operators (EQ-227). Both routes
// sit behind the case-officer Entra auth (requireAuthorised → role case_officer).
export const adminOperators = {
  plugin: {
    name: 'admin-operators',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: OPERATORS_PATH,
          ...operatorsController,
          options: {
            app,
            validate,
            pre: [{ method: requireAuthorised }]
          }
        },
        {
          method: 'GET',
          path: OPERATORS_EXPORT_PATH,
          ...operatorsExportController,
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
