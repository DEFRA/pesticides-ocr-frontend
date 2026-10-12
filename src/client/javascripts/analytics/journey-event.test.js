import { describe, test, expect, afterEach } from 'vitest'

import { pushJourneyEvent } from './journey-event.js'

const pageWith = (configElement) => {
  global.document = {
    getElementById: (id) => (id === 'js-analytics-config' ? configElement : null)
  }
  global.window = { dataLayer: [] }
}

describe('pushJourneyEvent (EQ-533)', () => {
  afterEach(() => {
    delete global.document
    delete global.window
  })

  test('pushes the event the page carries', () => {
    pageWith({ dataset: { event: 'journey_start' } })

    pushJourneyEvent()

    expect(window.dataLayer).toEqual([{ event: 'journey_start' }])
  })

  test('pushes it only once per page', () => {
    pageWith({ dataset: { event: 'journey_start' } })

    pushJourneyEvent()
    pushJourneyEvent()

    expect(window.dataLayer).toHaveLength(1)
  })

  test('creates the data layer if GTM has not', () => {
    pageWith({ dataset: { event: 'journey_start' } })
    delete window.dataLayer

    pushJourneyEvent()

    expect(window.dataLayer).toEqual([{ event: 'journey_start' }])
  })

  test('pushes nothing when the page has no journey event', () => {
    pageWith({ dataset: { gtmId: 'GTM-TEST' } })

    pushJourneyEvent()

    expect(window.dataLayer).toHaveLength(0)
  })

  test('pushes nothing on a page without analytics', () => {
    pageWith(null)

    pushJourneyEvent()

    expect(window.dataLayer).toHaveLength(0)
  })
})
