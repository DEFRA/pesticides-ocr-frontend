import { getAuthSession, PAGE_PATHS } from '@defra/hapi-oidc-auth'

import { statusCodes } from '#/server/common/constants/status-codes.js'
import { searchOperators, toCsv } from './operators-data.js'

// Resolve the current (optionally filtered) operators view from the request —
// shared by the grid and the export so the two stay in lockstep.
async function getFilteredOperators(request) {
  const search = (request.query.search ?? '').toString()
  // Forward the signed-in case officer's Entra ACCESS token to the backend (live
  // mode). With the `access_as_user` API scope on the app registration, the
  // access token's `aud` is the app's own client id — which the backend verifies
  // — and it carries `scp: access_as_user`. In mock mode the session has no token
  // and operators-data returns local sample data.
  const { token, idTokenHint } = getAuthSession(request)
  // Defence in depth: @defra/hapi-oidc-auth (<= 0.4.0) falls back to the ID token
  // when the access token is absent (`token: accessToken || idToken`). An ID token
  // forwarded as an API bearer would be accepted by the backend today (the `scp`
  // check is still pending — pesticides-ocr-backend #15), so refuse to forward it
  // and bounce the officer to re-authenticate for a fresh access token instead.
  // The proper fix is upstream: the plugin should throw when the access token is
  // missing rather than substitute the ID token.
  if (token && token === idTokenHint) {
    throw Object.assign(
      new Error('Forwarded token is an ID token, not an access token'),
      { statusCode: statusCodes.unauthorized }
    )
  }
  const operators = await searchOperators({ query: search, token })
  return { search, operators }
}

// A backend 401 means the forwarded case-officer token is missing/expired/
// rejected (the session cookie can outlive the ~1h Entra token). Send the
// officer back to re-authenticate rather than to a dead-end error page. Other
// statuses (403 wrong role, 502 upstream) fall through to the shared error page.
//
// POC follow-up: a refresh-token exchange (the plugin already captures one)
// would renew the token before it expires and avoid the bounce entirely.
function handleOperatorsError(err, h) {
  if (err.statusCode === statusCodes.unauthorized) {
    return h.redirect(`${PAGE_PATHS.ENTRA_SIGN_IN}?error=session-expired`)
  }
  throw err
}

// Grid + search (Dashboard API + Search API).
export const operatorsController = {
  async handler(request, h) {
    try {
      const { search, operators } = await getFilteredOperators(request)

      return h.view('admin/operators/index', {
        operators,
        search,
        total: operators.length
      })
    } catch (err) {
      return handleOperatorsError(err, h)
    }
  }
}

// Export to Excel (Export API) — CSV download of the current (filtered) view.
export const operatorsExportController = {
  async handler(request, h) {
    try {
      const { operators } = await getFilteredOperators(request)

      return h
        .response(toCsv(operators))
        .type('text/csv')
        .header(
          'content-disposition',
          'attachment; filename="ocr-registered-operators.csv"'
        )
    } catch (err) {
      return handleOperatorsError(err, h)
    }
  }
}
