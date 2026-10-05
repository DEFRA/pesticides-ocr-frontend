import Joi from 'joi'
import { requireAuthorised } from '@defra/hapi-oidc-auth'

import { viewFailAction } from '#/server/common/helpers/view-fail-action.js'
import { exampleReference } from './reference.js'

// Matches the backend's bound on a free-text search term.
const MAX_SEARCH_LENGTH = 100

export const SEARCH_FIELD = 'search'

export const app = {
  pageTitle: 'Search the register'
}

// The search page holds personal data (contact name, email, phone) and the URL
// carries the search term, so never let the browser or a proxy keep a copy —
// Back after sign-out on a shared machine must not show it. Hapi applies this
// to every response from the route, including validation errors and the auth
// guard's redirects.
export const cache = { otherwise: 'no-store' }

const renderErrors = viewFailAction('search/index', (request) => ({
  pageTitle: `Error: ${app.pageTitle}`,
  exampleReference: exampleReference(),
  [SEARCH_FIELD]: request.query[SEARCH_FIELD]
}))

// Hapi runs query validation (and its failAction) BEFORE route `pre` handlers,
// i.e. before `requireAuthorised`. So the failAction runs the same guard itself
// first: an unauthorised visitor gets the guard's sign-in redirect / 404, never
// the rendered page.
function guardedFailAction(request, h, error) {
  const guard = requireAuthorised(request, h)
  return guard === h.continue ? renderErrors(request, h, error) : guard
}

// One box: a term in the reference format is an exact lookup, anything else a
// free-text search, and blank lists everything. No term at all is the initial
// visit (just the form).
export const validate = {
  query: Joi.object({
    [SEARCH_FIELD]: Joi.string()
      .trim()
      .max(MAX_SEARCH_LENGTH)
      .allow('')
      .messages({
        'string.base': 'Enter one search term',
        'string.max': `Search must be ${MAX_SEARCH_LENGTH} characters or fewer`
      })
  }),
  options: { stripUnknown: true },
  failAction: guardedFailAction
}

// The export takes one reference (each result card links to its own). Its
// format is checked in the controller, since the prefix is config-driven.
export const validateExport = {
  query: Joi.object({
    reference: Joi.string().trim().required()
  }),
  options: { stripUnknown: true },
  failAction: (request, h) => {
    const guard = requireAuthorised(request, h)
    return guard === h.continue ? h.redirect('/search').takeover() : guard
  }
}
