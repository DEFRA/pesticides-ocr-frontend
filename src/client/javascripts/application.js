import {
  createAll,
  Button,
  Checkboxes,
  ErrorSummary,
  Radios,
  SkipLink
} from 'govuk-frontend'

import { loadAnalytics } from './analytics/load-analytics.js'
import { getConsentCookie } from './cookies/cookie-functions.js'
import { initCookieBanner } from './cookies/cookie-banner.js'
import { initCookiesPage } from './cookies/cookies-page.js'

createAll(Button)
createAll(Checkboxes)
createAll(ErrorSummary)
createAll(Radios)
createAll(SkipLink)

// Google Analytics + cookie consent (EQ-388 / EQ-363). The analytics config
// element is only rendered where analytics is enabled (see layouts/page.njk), so
// this is a no-op otherwise. GTM loads with Consent Mode defaults from the stored
// choice (denied until accepted); the banner and /cookies page update it.
const analyticsConfig = document.getElementById('js-analytics-config')
if (analyticsConfig) {
  const consent = getConsentCookie()
  loadAnalytics(analyticsConfig.dataset.gtmId, {
    analytics: Boolean(consent?.analytics)
  })
}
initCookieBanner()
initCookiesPage()
