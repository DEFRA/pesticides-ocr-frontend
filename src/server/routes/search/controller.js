import { getAuthSession, PAGE_PATHS } from '@defra/hapi-oidc-auth'

import { statusCodes } from '#/server/common/constants/status-codes.js'
import { buildMockAccessToken } from '#/server/common/helpers/mock-access-token.js'
import { app, SEARCH_FIELD } from './options.js'
import { exampleReference, toReference } from './reference.js'
import { searchRegister, getByReference } from './search-data.js'
import { fetchExport } from './search-client.js'

const VIEW = 'search/index'

const FORBIDDEN_MESSAGE = 'You do not have permission to search the register'
const UNAVAILABLE_MESSAGE =
  'Sorry, there is a problem with the service. Try again later.'

// Uses the configured prefix, so it is built per request.
const invalidReferenceMessage = () =>
  `Enter a reference in the correct format, like ${exampleReference()}`

// The token to forward to the backend: the signed-in case officer's Entra
// ACCESS token, or in mock sign-in (which has none) an unsigned one built from
// the mock identity (see mock-access-token).
function getForwardedToken(request) {
  const session = getAuthSession(request)
  const { token, idTokenHint } = session
  // The plugin can return the ID token as `token`; never forward that as an API
  // bearer, re-authenticate instead.
  if (token && token === idTokenHint) {
    throw Object.assign(
      new Error('Forwarded token is an ID token, not an access token'),
      { statusCode: statusCodes.unauthorized }
    )
  }
  return token || buildMockAccessToken(session)
}

// Context every render of the page needs.
const pageContext = (search) => ({
  exampleReference: exampleReference(),
  [SEARCH_FIELD]: search
})

// Error summary context for a single message. A message about the search term
// itself links to (and is shown on) the field; anything else is summary-only.
function errorContext(message, { onField = false } = {}) {
  return {
    pageTitle: `Error: ${app.pageTitle}`,
    errorList: [
      onField ? { text: message, href: `#${SEARCH_FIELD}` } : { text: message }
    ],
    errors: onField ? { [SEARCH_FIELD]: { text: message } } : {}
  }
}

// A 400 on a reference is the backend rejecting its format. A free-text term is
// already bounded to what the backend accepts, so any other 400 is unexpected
// and shown as a service problem.
function apiErrorContext(statusCode, isReference) {
  if (statusCode === statusCodes.badRequest && isReference) {
    return errorContext(invalidReferenceMessage(), { onField: true })
  }
  if (statusCode === statusCodes.forbidden) {
    return errorContext(FORBIDDEN_MESSAGE)
  }
  return errorContext(UNAVAILABLE_MESSAGE)
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
function handleApiError(err, request, h, { search, isReference }) {
  if (err.statusCode === statusCodes.unauthorized) {
    return h.redirect(`${PAGE_PATHS.ENTRA_SIGN_IN}?error=session-expired`)
  }
  if (!Number.isInteger(err.statusCode)) {
    throw err
  }
  const view = h.view(VIEW, {
    ...pageContext(search),
    ...apiErrorContext(err.statusCode, isReference)
  })
  if (err.statusCode >= statusCodes.internalServerError) {
    // Keep the upstream 5xx on the response so it still counts as a server
    // error, rather than a 200 that hides the backend being down.
    request.logger.error(err, `Search API error: ${err.message}`)
    return view.code(err.statusCode)
  }
  request.logger.warn(`Search API error: ${err.message}`)
  return view
}

// Find the registrations for a term: a reference is an exact lookup (none if
// not found); anything else is a free-text search, where blank lists everything.
async function findOperators(search, reference, token) {
  if (reference) {
    const operator = await getByReference(reference, token)
    return operator ? [operator] : []
  }
  return searchRegister({ query: search, token })
}

// Search the register (Search API). No term in the query is the initial visit,
// so only the form is shown.
export const searchController = {
  async handler(request, h) {
    const search = request.query[SEARCH_FIELD]

    if (search === undefined) {
      return h.view(VIEW, pageContext())
    }

    const reference = toReference(search)
    try {
      const token = getForwardedToken(request)
      const operators = await findOperators(search, reference, token)

      return h.view(VIEW, { ...pageContext(search), operators })
    } catch (err) {
      return handleApiError(err, request, h, {
        search,
        isReference: Boolean(reference)
      })
    }
  }
}

// Export one registration as CSV (Export API), linked from each result card.
// The backend builds the CSV; this forwards the officer's token and passes the
// file through. A value that isn't a reference shows the format error on the
// search page, as does any API error.
export const exportController = {
  async handler(request, h) {
    const search = request.query.reference
    const reference = toReference(search)

    if (!reference) {
      return h.view(VIEW, {
        ...pageContext(search),
        ...errorContext(invalidReferenceMessage(), { onField: true })
      })
    }

    try {
      const csv = await fetchExport(reference, getForwardedToken(request))

      return h
        .response(csv)
        .type('text/csv; charset=utf-8')
        .header(
          'content-disposition',
          `attachment; filename="ocr-registration-${reference}.csv"`
        )
    } catch (err) {
      return handleApiError(err, request, h, { search, isReference: true })
    }
  }
}
