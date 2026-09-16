/**
 * Load Google Tag Manager behind Google Consent Mode v2 (EQ-388).
 *
 * Ported from aqie-front-end's analytics loader. Consent defaults to "denied",
 * so GTM/GA set no analytics cookies and store no data until the user accepts
 * via the cookie banner (EQ-363), which re-runs this with `{ analytics: true }`
 * (or issues a consent 'update'). Loaded from our own bundle, so no inline
 * script / CSP hash is needed.
 *
 * @param {string} gtmId - the GTM container id (from the layout data attribute)
 * @param {{ analytics?: boolean }} [consent] - the user's stored consent, if any
 */
export function loadAnalytics(gtmId, consent = {}) {
  if (!gtmId || window.__ocrAnalyticsLoaded) {
    return
  }
  window.__ocrAnalyticsLoaded = true

  window.dataLayer = window.dataLayer || []
  function gtag(...args) {
    window.dataLayer.push(args)
  }

  // Consent Mode v2 defaults — everything denied until the user opts in. Must be
  // pushed before gtm.js loads so GA honours it from the first hit.
  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: consent.analytics ? 'granted' : 'denied'
  })

  // GTM bootstrap (the dynamic equivalent of Google's inline snippet).
  window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' })
  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtm.js?id=${gtmId}`
  document.head.appendChild(script)
}
