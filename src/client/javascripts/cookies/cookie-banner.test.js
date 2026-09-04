import { describe, test, expect, afterEach } from 'vitest'

import { initCookieBanner } from './cookie-banner.js'
import { getConsentCookie } from './cookie-functions.js'

function makeEl(initialHidden = false) {
  const attrs = new Map(initialHidden ? [['hidden', 'true']] : [])
  const listeners = {}
  return {
    addEventListener(type, fn) {
      ;(listeners[type] ||= []).push(fn)
    },
    click() {
      ;(listeners.click || []).forEach((fn) => fn())
    },
    setAttribute(key, value) {
      attrs.set(key, value)
    },
    removeAttribute(key) {
      attrs.delete(key)
    },
    getAttribute(key) {
      return attrs.get(key) ?? null
    },
    focus() {}
  }
}

function setupDom({ pathname = '/' } = {}) {
  const jar = new Map()
  const els = {
    banner: makeEl(true),
    '.js-cookie-banner-accept': makeEl(),
    '.js-cookie-banner-reject': makeEl(),
    '.js-cookie-banner-message': makeEl(),
    '.js-cookie-banner-confirmation-accept': makeEl(true),
    '.js-cookie-banner-confirmation-reject': makeEl(true),
    hide: makeEl()
  }
  els.banner.querySelector = (sel) => els[sel] ?? null
  els.banner.querySelectorAll = (sel) =>
    sel === '.js-cookie-banner-hide' ? [els.hide] : []

  global.document = {
    get cookie() {
      return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ')
    },
    set cookie(str) {
      const [pair] = str.split(';').map((s) => s.trim())
      const eq = pair.indexOf('=')
      const name = pair.slice(0, eq)
      const value = pair.slice(eq + 1)
      if (value === '') {
        jar.delete(name)
      } else {
        jar.set(name, value)
      }
    },
    querySelector: (sel) =>
      sel === "[data-module='govuk-cookie-banner']" ? els.banner : null,
    getElementById: () => null,
    location: { protocol: 'http:', hostname: 'localhost' }
  }
  global.window = {
    dataLayer: [],
    location: { protocol: 'http:', hostname: 'localhost', pathname }
  }
  return els
}

describe('initCookieBanner (EQ-363)', () => {
  afterEach(() => {
    delete global.document
    delete global.window
  })

  test('shows the banner when there is no valid consent', () => {
    const els = setupDom()
    initCookieBanner()
    expect(els.banner.getAttribute('hidden')).toBeNull()
  })

  test('does not run on the /cookies page', () => {
    const els = setupDom({ pathname: '/cookies' })
    initCookieBanner()
    // Banner stays hidden — it's managed on the /cookies page instead.
    expect(els.banner.getAttribute('hidden')).toBe('true')
  })

  test('Accept stores analytics consent and reveals the accepted message', () => {
    const els = setupDom()
    initCookieBanner()
    els['.js-cookie-banner-accept'].click()

    expect(getConsentCookie()).toMatchObject({ analytics: true })
    expect(els['.js-cookie-banner-message'].getAttribute('hidden')).toBe('true')
    expect(
      els['.js-cookie-banner-confirmation-accept'].getAttribute('hidden')
    ).toBeNull()
  })

  test('Reject stores analytics=false and reveals the rejected message', () => {
    const els = setupDom()
    initCookieBanner()
    els['.js-cookie-banner-reject'].click()

    expect(getConsentCookie()).toMatchObject({ analytics: false })
    expect(
      els['.js-cookie-banner-confirmation-reject'].getAttribute('hidden')
    ).toBeNull()
  })

  test('does not show the banner when valid consent already exists', () => {
    const els = setupDom()
    document.cookie = `ocr_cookies_analytics=${encodeURIComponent(
      JSON.stringify({ analytics: true, version: 1 })
    )}`
    initCookieBanner()
    expect(els.banner.getAttribute('hidden')).toBe('true')
  })

  test('the hide button dismisses the banner', () => {
    const els = setupDom()
    initCookieBanner()
    expect(els.banner.getAttribute('hidden')).toBeNull()
    els.hide.click()
    expect(els.banner.getAttribute('hidden')).toBe('true')
  })

  test('is a no-op when the banner element is absent', () => {
    global.document = {
      querySelector: () => null,
      getElementById: () => null
    }
    global.window = { location: { pathname: '/' } }
    expect(() => initCookieBanner()).not.toThrow()
  })
})
