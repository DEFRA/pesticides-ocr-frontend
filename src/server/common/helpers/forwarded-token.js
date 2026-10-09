import { getAuthSession } from '@defra/hapi-oidc-auth'

import { statusCodes } from '#/server/common/constants/status-codes.js'
import { buildMockAccessToken } from '#/server/common/helpers/mock-access-token.js'

// The token to forward to the backend: the signed-in case officer's Entra
// ACCESS token, or in mock sign-in (which has none) an unsigned one built from
// the mock identity (see mock-access-token).
export function getForwardedToken(request) {
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
