import { PAGE_PATHS } from '@defra/hapi-oidc-auth'

import { statusCodes } from '#/server/common/constants/status-codes.js'

export const UNAVAILABLE_MESSAGE =
  'Sorry, there is a problem with the service. Try again later.'

// A 401 means the officer's token has expired, so they sign in again. Other API
// errors render on the page, keeping a 5xx; errors without a status are bugs.
export function backendErrorResponse(err, request, h, { render, label }) {
  if (err.statusCode === statusCodes.unauthorized) {
    return h.redirect(`${PAGE_PATHS.ENTRA_SIGN_IN}?error=session-expired`)
  }
  if (!Number.isInteger(err.statusCode)) {
    throw err
  }
  const view = render(err.statusCode)
  if (err.statusCode >= statusCodes.internalServerError) {
    request.logger.error(err, `${label} API error: ${err.message}`)
    return view.code(err.statusCode)
  }
  request.logger.warn(`${label} API error: ${err.message}`)
  return view
}
