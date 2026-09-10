/**
 * Cookie + consent helpers for the OCR Register (EQ-363).
 *
 * Ported/adapted from aqie-front-end, simplified to GA4-only. Used by the cookie
 * banner and the /cookies page. The consent choice is stored in one essential
 * JSON cookie; analytics only run once the user has accepted.
 */

import { loadAnalytics } from '../analytics/load-analytics.js'
import {
  CONSENT_COOKIE_NAME,
  CONSENT_COOKIE_VERSION,
  CONSENT_COOKIE_MAX_AGE_DAYS
} from '#/config/cookie-consent.js'

// Re-exported so consumers/tests have one import site for the contract.
export { CONSENT_COOKIE_VERSION }

const DEFAULT_CONSENT = { analytics: false }

// GA4 analytics cookies (_ga and _ga_*), deleted on reject/withdrawal.
const ANALYTICS_COOKIE_PREFIXES = ['_ga']

function getCookie(name) {
  const nameEQ = `${name}=`
  for (const part of document.cookie.split(';')) {
    const cookie = part.trim()
    if (cookie.startsWith(nameEQ)) {
      return decodeURIComponent(cookie.substring(nameEQ.length))
    }
  }
  return null
}

function setCookie(name, value, { days } = {}) {
  // URL-encode on write so the JSON value is a valid cookie-octet and matches
  // the server-set cookie's encoding (getCookie decodes on read).
  let str = `${name}=${encodeURIComponent(value)}; path=/; SameSite=Lax`
  if (days) {
    const date = new Date()
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000)
    str += `; expires=${date.toUTCString()}`
  }
  if (document.location.protocol === 'https:') {
    str += '; Secure'
  }
  document.cookie = str
}

// The domains a cookie might have been set on: the exact host, each parent, and
// the dot-prefixed variants. Covers GA4's default `cookie_domain: 'auto'`, which
// sets _ga on the registrable parent domain (e.g. .example.com), not the host.
function candidateDomains() {
  const labels = window.location.hostname.split('.')
  const domains = new Set()
  for (let i = 0; i < labels.length - 1; i++) {
    const domain = labels.slice(i).join('.')
    domains.add(domain)
    domains.add(`.${domain}`)
  }
  return [...domains]
}

function deleteCookie(name) {
  const expired = 'expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
  document.cookie = `${name}=; ${expired}`
  for (const domain of candidateDomains()) {
    document.cookie = `${name}=; ${expired}; domain=${domain}`
  }
}

/** The stored consent preferences, or null if absent/malformed. */
export function getConsentCookie() {
  const raw = getCookie(CONSENT_COOKIE_NAME)
  if (!raw) {
    return null
  }
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/** True only if a consent cookie exists and is the current policy version. */
export function isValidConsentCookie(consent) {
  return Boolean(consent) && consent.version >= CONSENT_COOKIE_VERSION
}

/** Persist the user's choice, then apply it. */
export function setConsentCookie(options) {
  const consent = getConsentCookie() || { ...DEFAULT_CONSENT }
  Object.assign(consent, options)
  delete consent.essential
  consent.version = CONSENT_COOKIE_VERSION
  setCookie(CONSENT_COOKIE_NAME, JSON.stringify(consent), {
    days: CONSENT_COOKIE_MAX_AGE_DAYS
  })
  applyConsent()
}

function deleteAnalyticsCookies() {
  for (const part of document.cookie.split(';')) {
    const name = part.trim().split('=')[0]
    if (ANALYTICS_COOKIE_PREFIXES.some((prefix) => name.startsWith(prefix))) {
      deleteCookie(name)
    }
  }
}

/**
 * Apply the stored consent to analytics via Google Consent Mode.
 * - accepted: load GTM (if not already) and update consent to granted.
 * - rejected/absent: update consent to denied and remove any analytics cookies.
 */
export function applyConsent() {
  const consent = getConsentCookie() || DEFAULT_CONSENT
  const config = document.getElementById('js-analytics-config')
  window.dataLayer = window.dataLayer || []

  if (consent.analytics) {
    if (config) {
      loadAnalytics(config.dataset.gtmId, { analytics: true })
    }
    window.dataLayer.push([
      'consent',
      'update',
      { analytics_storage: 'granted' }
    ])
  } else {
    window.dataLayer.push([
      'consent',
      'update',
      { analytics_storage: 'denied' }
    ])
    deleteAnalyticsCookies()
  }
}
