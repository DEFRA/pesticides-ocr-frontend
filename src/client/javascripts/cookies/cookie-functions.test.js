import { describe, test, expect, beforeEach, afterEach } from 'vitest'

import {
  getConsentCookie,
  isValidConsentCookie,
  setConsentCookie,
  applyConsent,
  CONSENT_COOKIE_VERSION
} from './cookie-functions.js'

// Minimal cookie jar so the browser cookie code runs under the node env.
function makeDocument() {
  const jar = new Map()
  return {
    get cookie() {
      return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ')
    },
    set cookie(str) {
      const [pair, ...attrs] = str.split(';').map((s) => s.trim())
      const eq = pair.indexOf('=')
      const name = pair.slice(0, eq)
      const value = pair.slice(eq + 1)
      const expired = attrs.some(
        (a) => /^expires=/i.test(a) && new Date(a.slice(8)) < new Date()
      )
      if (expired || value === '') {
        jar.delete(name)
      } else {
        jar.set(name, value)
      }
    },
    getElementById: () => null,
    location: { protocol: 'http:', hostname: 'localhost' }
  }
}

describe('cookie-functions (EQ-363)', () => {
  beforeEach(() => {
    global.document = makeDocument()
    global.window = {
      dataLayer: [],
      location: { protocol: 'http:', hostname: 'localhost' }
    }
  })

  afterEach(() => {
    delete global.document
    delete global.window
  })

  const lastConsentUpdate = () =>
    [...window.dataLayer]
      .reverse()
      .find((e) => e[0] === 'consent' && e[1] === 'update')

  test('returns null when no consent cookie is set', () => {
    expect(getConsentCookie()).toBeNull()
  })

  test('accepting stores analytics=true at the current version', () => {
    setConsentCookie({ analytics: true })
    const consent = getConsentCookie()
    expect(consent.analytics).toBe(true)
    expect(consent.version).toBe(CONSENT_COOKIE_VERSION)
    expect(isValidConsentCookie(consent)).toBe(true)
    expect(lastConsentUpdate()?.[2].analytics_storage).toBe('granted')
  })

  // Readable as-is in dev tools (the Value column), and the same form the
  // server's no-JS path writes.
  test('writes the consent cookie as plain JSON', () => {
    setConsentCookie({ analytics: false })

    expect(document.cookie).toContain(
      'ocr_cookies_analytics={"analytics":false,"version":1}'
    )
  })

  test('still reads an older URL-encoded consent cookie', () => {
    document.cookie = `ocr_cookies_analytics=${encodeURIComponent(
      JSON.stringify({ analytics: true, version: 1 })
    )}`

    expect(getConsentCookie()).toMatchObject({ analytics: true, version: 1 })
  })

  test('treats a tampered, undecodable value as malformed rather than throwing', () => {
    document.cookie = 'ocr_cookies_analytics=%zz'

    expect(getConsentCookie()).toBeNull()
  })

  test('rejecting stores analytics=false, denies consent and deletes _ga cookies', () => {
    // NOTE: this fake jar keys cookies by name only, so it proves deletion is
    // *attempted* for the right names — not that the real-browser Domain match
    // succeeds (GA4 'auto' sets _ga on the registrable parent domain). The
    // parent-domain deletion in deleteCookie needs a manual/browser check.
    document.cookie = '_ga=GA1.1.123'
    document.cookie = '_ga_ABC=xyz'

    setConsentCookie({ analytics: false })

    expect(getConsentCookie().analytics).toBe(false)
    expect(lastConsentUpdate()?.[2].analytics_storage).toBe('denied')
    expect(document.cookie).not.toContain('_ga=')
    expect(document.cookie).not.toContain('_ga_ABC=')
  })

  test('pushes the consent update as an arguments object, which GTM requires', () => {
    setConsentCookie({ analytics: true })
    expect(Object.prototype.toString.call(lastConsentUpdate())).toBe(
      '[object Arguments]'
    )
  })

  test('applyConsent with no cookie defaults to denied', () => {
    applyConsent()
    expect(lastConsentUpdate()?.[2].analytics_storage).toBe('denied')
  })

  test('getConsentCookie returns null for a malformed cookie', () => {
    document.cookie = 'ocr_cookies_analytics=not-json'
    expect(getConsentCookie()).toBeNull()
  })

  test('deletes _ga cookies across parent domains on a subdomain host', () => {
    window.location.hostname = 'www.example.com'
    document.cookie = '_ga=GA1.1.1'
    setConsentCookie({ analytics: false })
    expect(document.cookie).not.toContain('_ga=')
  })

  test('applyConsent loads GTM when granted and the config element is present', () => {
    const appended = []
    document.getElementById = (id) =>
      id === 'js-analytics-config' ? { dataset: { gtmId: 'GTM-X' } } : null
    document.createElement = () => ({})
    document.head = { appendChild: (el) => appended.push(el) }
    document.cookie = `ocr_cookies_analytics=${encodeURIComponent(
      JSON.stringify({ analytics: true, version: 1 })
    )}`

    applyConsent()

    expect(
      appended.some((el) => String(el.src).includes('gtm.js?id=GTM-X'))
    ).toBe(true)
    expect(lastConsentUpdate()?.[2].analytics_storage).toBe('granted')
  })
})
