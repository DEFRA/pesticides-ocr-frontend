import { describe, test, expect, vi, beforeEach } from 'vitest'

import {
  recordJourneyStart,
  recordOncePerSession
} from '#/server/common/helpers/journey-beacon.js'
import { get } from './controller.js'

vi.mock('#/server/common/helpers/journey-beacon.js', () => ({
  recordJourneyStart: vi.fn(),
  recordOncePerSession: vi.fn()
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
    }
  }
}

const h = { view: vi.fn(() => 'VIEW') }

beforeEach(() => {
  vi.mocked(recordOncePerSession).mockReset()
  vi.mocked(recordJourneyStart).mockReset()
  h.view.mockReset()
})

describe('#businessActivities GET', () => {
  test('seeds the form session', () => {
    const request = fakeRequest()

    get.handler(request, h)

    expect(request.yar.get('formSession')).toEqual({})
  })

  test('delegates the journey-start beacon to recordOncePerSession', () => {
    const request = fakeRequest()

    get.handler(request, h)

    expect(recordOncePerSession).toHaveBeenCalledTimes(1)
    expect(recordOncePerSession).toHaveBeenCalledWith(
      request,
      expect.objectContaining({
        sessionKey: 'journeyStarted',
        record: recordJourneyStart,
        logMessage: expect.stringContaining('Journey start recorded')
      })
    )
  })
})
