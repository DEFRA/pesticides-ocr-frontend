import { getAuthSession } from '@defra/hapi-oidc-auth'

// The yar key the auth plugin stores its session under (its internal
// AUTH_SESSION_KEY, which the package does not re-export).
export const AUTH_SESSION_KEY = 'auth'

// Mock mode ships a generic demo identity ("Sam Taylor") hardcoded in the auth
// plugin. For local demos / UCD, normalise the signed-in mock session to a
// configured display name so the header and the account page agree. Live mode is
// authoritative and must never be touched.
export function applyMockIdentity(request, displayName) {
  if (!request?.yar) {
    return
  }

  const session = getAuthSession(request)
  if (!session.isAuthenticated || session.name === displayName) {
    return
  }

  const [firstName, ...rest] = displayName.split(' ')
  request.yar.set(AUTH_SESSION_KEY, {
    ...session,
    name: displayName,
    firstName,
    lastName: rest.join(' ')
  })
}
