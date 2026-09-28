import { getAuthSession, PAGE_PATHS } from '@defra/hapi-oidc-auth'

import { statusCodes } from '#/server/common/constants/status-codes.js'
import { searchRegistrations, toCsv } from './search-data.js'

// Resolve the current (optionally filtered) registrations from the request —
// shared by the grid and the export so the two stay in lockstep.
async function getFilteredRegistrations(request) {
  const search = (request.query.search ?? '').toString()
  // Forward the signed-in case officer's Entra ACCESS token to the backend (live
  // mode). With the `access_as_user` API scope on the app registration, the
  // access token's `aud` is the app's own client id — which the backend verifies
  // — and it carries `scp: access_as_user`. In mock mode the session has no token
  // and search-data returns local sample data.
  const { token, idTokenHint } = getAuthSession(request)
  // Defence in depth: @defra/hapi-oidc-auth (<= 0.4.0) falls back to the ID token
  // when the access token is absent (`token: accessToken || idToken`). An ID token
  // forwarded as an API bearer would be accepted by any backend tier that doesn't
  // set ENTRA_REQUIRED_SCOPE, so refuse to forward it and bounce the officer to
  // re-authenticate for a fresh access token instead.
  // The proper fix is upstream: the plugin should throw when the access token is
  // missing rather than substitute the ID token.
  if (token && token === idTokenHint) {
    throw Object.assign(
      new Error('Forwarded token is an ID token, not an access token'),
      { statusCode: statusCodes.unauthorized }
    )
  }
  const registrations = await searchRegistrations({ query: search, token })
  return { search, registrations }
}

// A backend 401 means the forwarded case-officer token is missing/expired/
// rejected (the session cookie can outlive the ~1h Entra token). Send the
// officer back to re-authenticate rather than to a dead-end error page. Other
// statuses (403 wrong role, 502 upstream) fall through to the shared error page.
//
// POC follow-up: a refresh-token exchange (the plugin already captures one)
// would renew the token before it expires and avoid the bounce entirely.
function handleBackendError(err, h) {
  if (err.statusCode === statusCodes.unauthorized) {
    return h.redirect(`${PAGE_PATHS.ENTRA_SIGN_IN}?error=session-expired`)
  }
  throw err
}

// Grid + search.
export const searchController = {
  async handler(request, h) {
    try {
      const { search, registrations } = await getFilteredRegistrations(request)

      return h.view('admin/search/index', {
        registrations,
        search,
        total: registrations.length
      })
    } catch (err) {
      return handleBackendError(err, h)
    }
  }
}

// Export to Excel — CSV download of the current (filtered) view.
export const exportController = {
  async handler(request, h) {
    try {
      const { registrations } = await getFilteredRegistrations(request)

      return h
        .response(toCsv(registrations))
        .type('text/csv')
        .header(
          'content-disposition',
          'attachment; filename="ocr-registered-operators.csv"'
        )
    } catch (err) {
      return handleBackendError(err, h)
    }
  }
}
