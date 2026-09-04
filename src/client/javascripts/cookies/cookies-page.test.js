import { describe, test, expect, afterEach } from 'vitest'

import { initCookiesPage } from './cookies-page.js'
import { setConsentCookie, getConsentCookie } from './cookie-functions.js'

function makeRadio(value) {
  return { value, checked: false }
}

function makeSuccess() {
  const attrs = new Map([['hidden', 'true']])
  return {
    setAttribute: (k, v) => attrs.set(k, v),
    removeAttribute: (k) => attrs.delete(k),
    getAttribute: (k) => attrs.get(k) ?? null,
    focus() {}
  }
}

function setupDom() {
  const jar = new Map()
  const yes = makeRadio('yes')
  const no = makeRadio('no')
  const success = makeSuccess()
  const submitListeners = []

  const form = {
    addEventListener(type, fn) {
      if (type === 'submit') {
        submitListeners.push(fn)
      }
    },
    submit() {
      submitListeners.forEach((fn) => fn({ preventDefault() {} }))
    },
    querySelector(sel) {
      if (sel.includes('[value="yes"]')) {
        return yes
      }
      if (sel.includes('[value="no"]')) {
        return no
      }
      if (sel.includes(':checked')) {
        return [yes, no].find((r) => r.checked) ?? null
      }
      return null
    }
  }

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
    querySelector(sel) {
      if (sel === '.js-cookies-page-form') {
        return form
      }
      if (sel === '.js-cookies-page-success') {
        return success
      }
      return null
    },
    getElementById: () => null,
    location: { protocol: 'http:', hostname: 'localhost' }
  }
  global.window = {
    dataLayer: [],
    scrollTo() {},
    location: { protocol: 'http:', hostname: 'localhost' }
  }
  return { yes, no, success, form }
}

describe('initCookiesPage (EQ-363)', () => {
  afterEach(() => {
    delete global.document
    delete global.window
  })

  test('pre-selects "yes" when analytics consent is already stored', () => {
    const els = setupDom()
    setConsentCookie({ analytics: true })
    initCookiesPage()
    expect(els.yes.checked).toBe(true)
  })

  test('saving "yes" stores consent and shows the success message', () => {
    const els = setupDom()
    initCookiesPage()
    els.yes.checked = true
    els.form.submit()

    expect(getConsentCookie()).toMatchObject({ analytics: true })
    expect(els.success.getAttribute('hidden')).toBeNull()
  })

  test('saving "no" stores analytics=false', () => {
    const els = setupDom()
    initCookiesPage()
    els.no.checked = true
    els.form.submit()

    expect(getConsentCookie()).toMatchObject({ analytics: false })
  })

  test('is a no-op when the form is absent', () => {
    global.document = { querySelector: () => null, getElementById: () => null }
    global.window = {}
    expect(() => initCookiesPage()).not.toThrow()
  })
})
