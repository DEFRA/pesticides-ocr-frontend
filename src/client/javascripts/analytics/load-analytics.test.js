import { describe, test, expect, beforeEach, afterEach } from 'vitest'

import { gtag, loadAnalytics } from './load-analytics.js'

// The loader is browser code; stub the minimal window/document it touches so it
// can run under the node test environment.
describe('loadAnalytics (EQ-388)', () => {
  let appended

  beforeEach(() => {
    appended = []
    global.window = { dataLayer: [] }
    global.document = {
      createElement: () => ({}),
      head: { appendChild: (el) => appended.push(el) }
    }
  })

  afterEach(() => {
    delete global.window
    delete global.document
  })

  const consentDefault = () =>
    window.dataLayer.find((e) => e[0] === 'consent' && e[1] === 'default')

  test('defaults Consent Mode analytics_storage to denied', () => {
    loadAnalytics('GTM-TEST')
    expect(consentDefault()?.[2].analytics_storage).toBe('denied')
    expect(consentDefault()?.[2].ad_storage).toBe('denied')
  })

  test('pushes the consent default as an arguments object, which GTM requires', () => {
    loadAnalytics('GTM-TEST')
    expect(Object.prototype.toString.call(consentDefault())).toBe(
      '[object Arguments]'
    )
  })

  test('gtag creates the dataLayer if the page has none yet', () => {
    global.window = {}
    gtag('consent', 'update', { analytics_storage: 'denied' })
    expect(window.dataLayer).toHaveLength(1)
    expect(window.dataLayer[0][0]).toBe('consent')
  })

  test('grants analytics_storage only when consent.analytics is true', () => {
    loadAnalytics('GTM-TEST', { analytics: true })
    expect(consentDefault()?.[2].analytics_storage).toBe('granted')
  })

  test('loads gtm.js for the given container id', () => {
    loadAnalytics('GTM-ABC123')
    expect(appended).toHaveLength(1)
    expect(appended[0].src).toBe(
      'https://www.googletagmanager.com/gtm.js?id=GTM-ABC123'
    )
  })

  test('is a no-op without a container id', () => {
    loadAnalytics()
    expect(window.dataLayer).toHaveLength(0)
    expect(appended).toHaveLength(0)
  })

  test('does not load GTM twice', () => {
    loadAnalytics('GTM-TEST')
    loadAnalytics('GTM-TEST')
    expect(appended).toHaveLength(1)
  })
})
