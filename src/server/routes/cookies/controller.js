import Boom from '@hapi/boom'

import { config } from '#/config/config.js'
import {
  CONSENT_COOKIE_NAME,
  CONSENT_COOKIE_VERSION,
  CONSENT_COOKIE_MAX_AGE_DAYS,
  CONSENT_FORM_FIELD
} from '#/config/cookie-consent.js'

// /cookies page (EQ-363). GET renders the preferences page (pre-filled from the
// existing choice for no-JS users); POST is the no-JS fallback that stores the
// choice server-side (the client enhances the form to save without a reload).
const ONE_DAY_MS = 24 * 60 * 60 * 1000

// Read the current analytics choice from the request's consent cookie, tolerant
// of a missing/malformed/old-version value (treated as "not accepted"). Decoding
// first also reads cookies written URL-encoded before the value became plain
// JSON; decoding plain JSON leaves it unchanged.
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

// The host an Origin header names, or null when it can't be parsed. Browsers
// send the literal `null` from sandboxed frames and some redirects; treating an
// unparseable origin as foreign turns that into a 403 rather than a 500.
function originHost(origin) {
  try {
    return new URL(origin).host
  } catch {
    return null
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
    if (origin && originHost(origin) !== request.info.host) {
      return Boom.forbidden('Cross-origin request rejected')
    }

    const analytics = request.payload?.[CONSENT_FORM_FIELD] === 'yes'
    // Plain JSON, the same form the client writes (see cookie-functions.js), so
    // both paths agree and the value is readable in dev tools. Allowed because
    // the server runs with strictHeader: false.
    const value = JSON.stringify({ analytics, version: CONSENT_COOKIE_VERSION })

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
