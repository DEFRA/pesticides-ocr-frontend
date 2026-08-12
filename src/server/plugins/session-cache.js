import yar from '@hapi/yar'

import { config } from '#/config/config.js'

const sessionConfig = config.get('session')

/**
 * Set options.maxCookieSize to 0 to always use server-side storage
 */
export const sessionCache = {
  plugin: yar,
  options: {
    name: sessionConfig.cache.name,
    cache: {
      cache: sessionConfig.cache.name,
      expiresIn: sessionConfig.cache.ttl
    },
    storeBlank: false,
    errorOnCacheNotReady: true,
    cookieOptions: {
      password: sessionConfig.cookie.password,
      ttl: sessionConfig.cookie.ttl,
      isSecure: config.get('session.cookie.secure'),
      // Live Entra sign-in returns via a cross-site form_post to the callback;
      // a Lax/Strict cookie isn't sent on that request, losing the OIDC
      // state/nonce/PKCE. Use SameSite=None when Secure (falls back to Lax
      // locally where the cookie isn't secure).
      isSameSite: config.get('session.cookie.secure') ? 'None' : 'Lax',
      clearInvalid: true
    }
  }
}
