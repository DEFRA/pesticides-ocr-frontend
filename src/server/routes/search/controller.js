import { getAuthSession, PAGE_PATHS } from '@defra/hapi-oidc-auth'

import { statusCodes } from '#/server/common/constants/status-codes.js'
import { buildMockAccessToken } from '#/server/common/helpers/mock-access-token.js'
import { app, INVALID_REFERENCE_MESSAGE } from './options.js'
import { getOperatorById } from './operators-data.js'

const VIEW = 'search/index'
const REFERENCE_FIELD = 'reference'

const MESSAGES = {
  invalidReference: INVALID_REFERENCE_MESSAGE,
  forbidden: 'You do not have permission to search the register',
  unavailable: 'Sorry, there is a problem with the service. Try again later.'
}

// Resolve the signed-in case officer's Entra ACCESS token to forward to the
// backend. With the `access_as_user` API scope on the app registration, the
// access token's `aud` is the app's own client id — which the backend verifies
// — and it carries `scp: access_as_user`. Mock sign-in has no token, so it
// forwards an unsigned one built from the mock identity (see mock-access-token).
function getForwardedToken(request) {
  const session = getAuthSession(request)
  const { token, idTokenHint } = session
  // Defence in depth: @defra/hapi-oidc-auth (<= 0.4.0) falls back to the ID token
  // when the access token is absent (`token: accessToken || idToken`). An ID token
  // forwarded as an API bearer would be accepted by any backend tier that doesn't
  // set ENTRA_REQUIRED_SCOPE (the `scp` check from pesticides-ocr-backend #15 is
  // config-gated), so refuse to forward it and bounce the officer to
  // re-authenticate for a fresh access token instead.
  // The proper fix is upstream: the plugin should throw when the access token is
  // missing rather than substitute the ID token.
  if (token && token === idTokenHint) {
    throw Object.assign(
      new Error('Forwarded token is an ID token, not an access token'),
      { statusCode: statusCodes.unauthorized }
    )
  }
  return token || buildMockAccessToken(session)
}

// Error summary context for a single message. A message about the reference
// itself links to (and is shown on) the field; anything else is summary-only.
function errorContext(message, { onField = false } = {}) {
  return {
    pageTitle: `Error: ${app.pageTitle}`,
    errorList: [onField ? { text: message, href: `#${REFERENCE_FIELD}` } : { text: message }],
    errors: onField ? { [REFERENCE_FIELD]: { text: message } } : {}
  }
}

function apiErrorContext(statusCode) {
  if (statusCode === statusCodes.badRequest) {
    return errorContext(MESSAGES.invalidReference, { onField: true })
  }
  if (statusCode === statusCodes.forbidden) {
    return errorContext(MESSAGES.forbidden)
  }
  return errorContext(MESSAGES.unavailable)
}

// A backend 401 means the forwarded case-officer token is missing/expired/
// rejected (the session cookie can outlive the ~1h Entra token). Send the
// officer back to re-authenticate rather than showing an error they can't fix.
// Any other API error (400 bad reference, 403 wrong role, 502 upstream) is shown
// in an error summary on the search page. The page shows none of the backend's
// message, so the reason is logged server-side for diagnosis.
//
// Errors without a statusCode aren't from the API (they're bugs, e.g. in the
// mapper), so they fall through to the shared error page.
//
// POC follow-up: a refresh-token exchange (the plugin already captures one)
// would renew the token before it expires and avoid the bounce entirely.
function handleSearchError(err, request, h, reference) {
  if (err.statusCode === statusCodes.unauthorized) {
    return h.redirect(`${PAGE_PATHS.ENTRA_SIGN_IN}?error=session-expired`)
  }
  if (!Number.isInteger(err.statusCode)) {
    throw err
  }
  const view = h.view(VIEW, { reference, ...apiErrorContext(err.statusCode) })
  if (err.statusCode >= statusCodes.internalServerError) {
    // Keep the upstream 5xx on the response so it still counts as a server
    // error, rather than a 200 that hides the backend being down.
    request.logger.error(err, `Search API error: ${err.message}`)
    return view.code(err.statusCode)
  }
  request.logger.warn(`Search API error: ${err.message}`)
  return view
}

// Look up a single registration by reference (Search API). The route's query
// validation has already checked a given reference is present and well formed;
// no reference in the query is the initial visit, so only the form is shown.
export const searchController = {
  async handler(request, h) {
    const { reference } = request.query

    if (reference === undefined) {
      return h.view(VIEW, {})
    }

    try {
      const operator = await getOperatorById(
        reference,
        getForwardedToken(request)
      )

      return h.view(VIEW, { reference, operator, notFound: !operator })
    } catch (err) {
      return handleSearchError(err, request, h, reference)
    }
  }
}
