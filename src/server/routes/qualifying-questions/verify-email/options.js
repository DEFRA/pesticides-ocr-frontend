import { NO_STORE_CACHE } from '#/server/common/constants/cache-control.js'

// The link puts the token in the URL, so no page here passes its address on.
export const options = {
  cache: NO_STORE_CACHE,
  security: { referrer: 'no-referrer' },
  app: {
    pageTitle: 'Confirm your email address',
    hideBackLink: true
  }
}
