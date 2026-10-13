import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'

// Stub GOV.UK Frontend so importing the entry doesn't need real components.
vi.mock('govuk-frontend', () => ({
  createAll: vi.fn(),
  Button: {},
  Checkboxes: {},
  ErrorSummary: {},
  Radios: {},
  SkipLink: {}
}))

// The entry wires GOV.UK components + the analytics/cookie behaviour on load.
// With no matching DOM it should initialise safely (every branch a no-op).
describe('application entry (EQ-388/EQ-363 wiring)', () => {
  beforeEach(() => {
    vi.resetModules()
    global.document = {
      querySelector: () => null,
      querySelectorAll: () => [],
      getElementById: () => null,
      body: { classList: { contains: () => false } }
    }
    global.window = {
      dataLayer: [],
      location: { pathname: '/', protocol: 'http:', hostname: 'localhost' }
    }
  })

  afterEach(() => {
    delete global.document
    delete global.window
    vi.resetModules()
  })

  test('initialises without throwing when no analytics/cookie DOM is present', async () => {
    await expect(
      import('#/client/javascripts/application.js')
    ).resolves.toBeDefined()
  })

  test('does not start analytics when the config element is absent', async () => {
    await import('#/client/javascripts/application.js')
    // No js-analytics-config element -> loadAnalytics never runs -> no gtm.start
    expect(window.dataLayer).toHaveLength(0)
  })

  test('starts analytics via Consent Mode when the config element is present', async () => {
    const appended = []
    global.document = {
      querySelector: () => null,
      querySelectorAll: () => [],
      getElementById: (id) =>
        id === 'js-analytics-config' ? { dataset: { gtmId: 'GTM-TEST' } } : null,
      createElement: () => ({}),
      head: { appendChild: (el) => appended.push(el) },
      cookie: '',
      body: { classList: { contains: () => false } },
      location: { protocol: 'http:', hostname: 'localhost' }
    }
    global.window = {
      dataLayer: [],
      location: { pathname: '/', protocol: 'http:', hostname: 'localhost' }
    }

    await import('#/client/javascripts/application.js')

    // Consent Mode default is pushed and gtm.js is loaded for the container.
    expect(
      window.dataLayer.some((e) => e[0] === 'consent' && e[1] === 'default')
    ).toBe(true)
    expect(
      appended.some((el) => String(el.src).includes('gtm.js?id=GTM-TEST'))
    ).toBe(true)
  })

  const pageWithJourneyEvent = (cookie) => {
    global.document = {
      querySelector: () => null,
      querySelectorAll: () => [],
      getElementById: (id) =>
        id === 'js-analytics-config'
          ? { dataset: { gtmId: 'GTM-TEST', event: 'journey_start' } }
          : null,
      createElement: () => ({}),
      head: { appendChild: () => {} },
      cookie,
      body: { classList: { contains: () => false } },
      location: { protocol: 'http:', hostname: 'localhost' }
    }
  }

  test('pushes the page journey event when analytics was already accepted', async () => {
    pageWithJourneyEvent(
      `ocr_cookies_analytics=${encodeURIComponent(
        JSON.stringify({ analytics: true, version: 1 })
      )}`
    )

    await import('#/client/javascripts/application.js')

    expect(window.dataLayer).toContainEqual({ event: 'journey_start' })
  })

  test('does not push the page journey event without consent', async () => {
    pageWithJourneyEvent('')

    await import('#/client/javascripts/application.js')

    expect(window.dataLayer).not.toContainEqual({ event: 'journey_start' })
  })
})
