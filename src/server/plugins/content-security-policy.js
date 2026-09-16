import Blankie from 'blankie'

/**
 * Manage content security policies.
 * @satisfies {import('@hapi/hapi').Plugin}
 */
const contentSecurityPolicy = {
  plugin: Blankie,
  options: {
    // Hash 'sha256-GUQ5ad8JK5KmEWmROf3LZd9ge94daqNvd8xy9YS1iDw=' is to support a GOV.UK frontend script bundled within Nunjucks macros
    // https://frontend.design-system.service.gov.uk/import-javascript/#if-our-inline-javascript-snippet-is-blocked-by-a-content-security-policy
    defaultSrc: ['self'],
    fontSrc: ['self', 'data:'],
    // *.google-analytics.com / *.analytics.google.com: GA4 measurement beacons
    // sent by Google Tag Manager (EQ-388).
    connectSrc: [
      'self',
      'wss',
      'data:',
      'https://*.google-analytics.com',
      'https://*.analytics.google.com',
      'https://*.googletagmanager.com'
    ],
    mediaSrc: ['self'],
    styleSrc: ['self'],
    // googletagmanager.com serves gtm.js, loaded at runtime by our own analytics
    // module (client/javascripts/analytics/load-analytics.js) — bundled from
    // 'self', so no inline-script hash is needed (EQ-388).
    scriptSrc: [
      'self',
      "'sha256-GUQ5ad8JK5KmEWmROf3LZd9ge94daqNvd8xy9YS1iDw='",
      'https://www.googletagmanager.com'
    ],
    // GA4 tags fired by the GTM container send tracking pixels here (the img
    // beacon is GA4's fallback when fetch/sendBeacon is unavailable).
    imgSrc: [
      'self',
      'data:',
      'https://*.google-analytics.com',
      'https://*.analytics.google.com',
      'https://*.googletagmanager.com'
    ],
    frameSrc: ['self', 'data:'],
    objectSrc: ['none'],
    frameAncestors: ['none'],
    // The case-officer sign-out is a POST form that redirects to Entra's
    // end-session endpoint; `form-action` is enforced across that redirect, so
    // Microsoft's login host must be allowed or the sign-out navigation is
    // blocked. (Sign-in is a GET link, so it isn't affected.)
    formAction: ['self', 'https://login.microsoftonline.com'],
    manifestSrc: ['self'],
    generateNonces: false
  }
}

export { contentSecurityPolicy }
