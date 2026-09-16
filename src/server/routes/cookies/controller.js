import Boom from '@hapi/boom'

import { config } from '#/config/config.js'
import {
  CONSENT_COOKIE_NAME,
  CONSENT_COOKIE_VERSION,
  CONSENT_COOKIE_MAX_AGE_DAYS
} from '#/config/cookie-consent.js'

// /cookies page (EQ-363). GET renders the preferences page (pre-filled from the
// existing choice for no-JS users); POST is the no-JS fallback that stores the
// choice server-side (the client enhances the form to save without a reload).
const ONE_DAY_MS = 24 * 60 * 60 * 1000

// Read the current analytics choice from the request's consent cookie, tolerant
// of a missing/malformed/old-version value (treated as "not accepted").
function currentAnalyticsChoice(request) {
  const raw = request.state?.[CONSENT_COOKIE_NAME]
  if (!raw) {
    return false
  }
  try {
    const consent = JSON.parse(decodeURIComponent(raw))
    return consent.version >= CONSENT_COOKIE_VERSION && Boolean(consent.analytics)
  } catch {
    return false
  }
}

export const getCookies = {
  handler(request, h) {
    return h.view('cookies/index', {
      pageTitle: 'Cookies',
      saved: request.query.saved === 'true',
      analyticsAccepted: currentAnalyticsChoice(request)
    })
  }
}

export const postCookies = {
  handler(request, h) {
    // Same-origin guard: this endpoint sets a consent cookie, so reject a
    // cross-site forged submission (which would opt a user in/out without their
    // knowledge). Browsers send Origin on form POSTs and scripts can't forge it.
    const { origin } = request.headers
    if (origin && new URL(origin).host !== request.info.host) {
      return Boom.forbidden('Cross-origin request rejected')
    }

    const analytics = request.payload?.cookies?.analytics === 'yes'
    // URL-encoded so the JSON is a valid cookie value; the client reads it with
    // decodeURIComponent (see cookie-functions.js), so both paths agree.
    const value = encodeURIComponent(
      JSON.stringify({ analytics, version: CONSENT_COOKIE_VERSION })
    )

    return h.redirect('/cookies?saved=true').state(CONSENT_COOKIE_NAME, value, {
      path: '/',
      ttl: CONSENT_COOKIE_MAX_AGE_DAYS * ONE_DAY_MS,
      isSecure: config.get('isProduction'),
      isHttpOnly: false,
      isSameSite: 'Lax',
      encoding: 'none'
    })
  }
}
