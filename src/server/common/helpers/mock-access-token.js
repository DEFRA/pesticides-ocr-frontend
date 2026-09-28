import { config } from '#/config/config.js'

const base64url = (value) =>
  Buffer.from(JSON.stringify(value)).toString('base64url')

// Mock sign-in carries no Entra access token, so there is nothing to forward to
// the OCR backend and every backend call would 401. The backend's own mock auth
// mode (local only; it fails closed on deployed tiers) decodes the bearer JWT
// without verifying it, so in mock mode build an UNSIGNED token from the
// signed-in mock identity — its subject, name and roles — so local searches
// reach the real local backend. Returns '' outside mock mode, or for a session
// that isn't signed in, so a live session can never be given one.
//
// A backend in live mode rejects this token (no valid signature), so a
// misconfigured ENTRA_AUTH_MODE surfaces as a 401 rather than as access.
export function buildMockAccessToken(session) {
  if (config.get('entra.mode') !== 'mock' || !session?.isAuthenticated) {
    return ''
  }

  const header = { alg: 'none', typ: 'JWT' }
  const payload = {
    sub: session.subject,
    name: session.name,
    roles: session.roles ?? []
  }
  return `${base64url(header)}.${base64url(payload)}.`
}
