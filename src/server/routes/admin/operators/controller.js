import { getAuthSession, PAGE_PATHS } from '@defra/hapi-oidc-auth'

import { statusCodes } from '#/server/common/constants/status-codes.js'
import { searchOperators, toCsv } from './operators-data.js'

// Resolve the current (optionally filtered) operators view from the request —
// shared by the grid and the export so the two stay in lockstep.
async function getFilteredOperators(request) {
  const search = (request.query.search ?? '').toString()
  // Forward the signed-in case officer's Entra ID token to the backend (live
  // mode). Its `aud` is the app's client id, which the backend verifies; the
  // access token would carry a Graph audience and be rejected. In mock mode the
  // session has no token and operators-data returns local sample data.
  const { idTokenHint: token } = getAuthSession(request)
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
