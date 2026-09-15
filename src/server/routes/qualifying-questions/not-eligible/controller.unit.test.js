import { describe, test, expect, vi, beforeEach } from 'vitest'

import { recordJourneyNotEligible } from '#/server/common/helpers/journey-beacon.js'
import { get } from './controller.js'

vi.mock('#/server/common/helpers/journey-beacon.js', () => ({
  recordJourneyNotEligible: vi.fn()
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
  vi.mocked(recordJourneyNotEligible).mockReset()
  h.view.mockReset()
})

describe('#notEligible GET — journey not-eligible beacon', () => {
  test('fires the beacon once on first visit and marks the session', () => {
    const request = fakeRequest()

    get.handler(request, h)

    expect(recordJourneyNotEligible).toHaveBeenCalledTimes(1)
    expect(recordJourneyNotEligible).toHaveBeenCalledWith(request)
    expect(request.yar.get('notEligibleRecorded')).toBe(true)
    expect(request.logger.info).toHaveBeenCalledTimes(1)
  })

  test('does not fire again when the session is already marked', () => {
    const request = fakeRequest({ notEligibleRecorded: true })

    get.handler(request, h)

    expect(recordJourneyNotEligible).not.toHaveBeenCalled()
    expect(request.logger.info).not.toHaveBeenCalled()
  })
})
