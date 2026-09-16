// Shared consent-cookie contract (EQ-363). Imported by both the client
// (cookie-functions.js) and the server (/cookies controller) so the cookie name,
// version and lifetime are a single source of truth and can't drift apart.

export const CONSENT_COOKIE_NAME = 'ocr_cookies_analytics'

// Bump when the cookie policy or the stored shape changes — users are then
// re-shown the banner to consent again (enforced via isValidConsentCookie).
export const CONSENT_COOKIE_VERSION = 1

export const CONSENT_COOKIE_MAX_AGE_DAYS = 365
