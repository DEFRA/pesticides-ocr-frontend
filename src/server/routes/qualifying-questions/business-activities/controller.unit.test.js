import { describe, test, expect, vi, beforeEach } from 'vitest'

import { recordJourneyStart } from '#/server/common/helpers/record-journey-start.js'
import { get } from './controller.js'

vi.mock('#/server/common/helpers/record-journey-start.js', () => ({
  recordJourneyStart: vi.fn()
}))

// Minimal request stand-in with an in-memory yar store.
function fakeRequest(initial = {}) {
  const store = { ...initial }
  return {
    yar: {
      get: (key) => store[key],
      set: (key, value) => {
        store[key] = value
      }
    },
    logger: { info: vi.fn() }
  }
}

const h = { view: vi.fn(() => 'VIEW') }

beforeEach(() => {
  vi.mocked(recordJourneyStart).mockReset()
  h.view.mockReset()
})

describe('#businessActivities GET — journey-start beacon', () => {
  test('fires the beacon once on first visit and marks the session', () => {
    const request = fakeRequest()

    get.handler(request, h)

    expect(recordJourneyStart).toHaveBeenCalledTimes(1)
    expect(recordJourneyStart).toHaveBeenCalledWith(request)
    expect(request.yar.get('journeyStarted')).toBe(true)
    expect(request.logger.info).toHaveBeenCalledTimes(1)
  })

  test('does not fire again when the session is already marked', () => {
    const request = fakeRequest({ journeyStarted: true })

    get.handler(request, h)

    expect(recordJourneyStart).not.toHaveBeenCalled()
    expect(request.logger.info).not.toHaveBeenCalled()
  })
})
