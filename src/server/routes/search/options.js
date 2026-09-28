import Joi from 'joi'
import { requireAuthorised } from '@defra/hapi-oidc-auth'

import { viewFailAction } from '#/client/common/helpers/view-fail-action.js'

// A registration reference: PPP followed by two groups of three upper-case
// letters or digits, e.g. PPP-1A2-B3C.
const REFERENCE_PATTERN = /^PPP-[A-Z0-9]{3}-[A-Z0-9]{3}$/

const ENTER_REFERENCE_MESSAGE = 'Enter a reference'
export const INVALID_REFERENCE_MESSAGE =
  'Enter a reference in the correct format, like PPP-1A2-B3C'

export const app = {
  pageTitle: 'Search the register'
}

const renderErrors = viewFailAction('search/index', (request) => ({
  pageTitle: `Error: ${app.pageTitle}`,
  reference: request.query.reference
}))

// No reference at all is the initial visit (just the form). Once the form is
// submitted the reference must be present and in the PPP-XXX-XXX format.
//
// NOTE: Hapi runs query validation (and this failAction) BEFORE route `pre`
// handlers, i.e. before `requireAuthorised`. So the failAction runs the same
// guard itself first: an unauthorised visitor gets the guard's sign-in
// redirect / 404, never the rendered page.
export const validate = {
  query: Joi.object({
    reference: Joi.string().trim().pattern(REFERENCE_PATTERN).messages({
      'string.empty': ENTER_REFERENCE_MESSAGE,
      'string.base': INVALID_REFERENCE_MESSAGE,
      'string.pattern.base': INVALID_REFERENCE_MESSAGE
    })
  }),
  options: { stripUnknown: true },
  failAction: (request, h, error) => {
    const guard = requireAuthorised(request, h)
    return guard === h.continue ? renderErrors(request, h, error) : guard
  }
}
