import { describe, test, expect, vi, beforeEach } from 'vitest'

import {
  recordJourneyNotEligible,
  recordOncePerSession
} from '#/server/common/helpers/journey-beacon.js'
import { get } from './controller.js'

vi.mock('#/server/common/helpers/journey-beacon.js', () => ({
  recordJourneyNotEligible: vi.fn(),
  recordOncePerSession: vi.fn()
}))

const request = {}
const h = { view: vi.fn(() => 'VIEW') }

beforeEach(() => {
  vi.mocked(recordOncePerSession).mockReset()
  vi.mocked(recordJourneyNotEligible).mockReset()
  h.view.mockReset()
})

describe('#notEligible GET', () => {
  test('delegates the not-eligible beacon to recordOncePerSession', () => {
    get.handler(request, h)

    expect(recordOncePerSession).toHaveBeenCalledTimes(1)
    expect(recordOncePerSession).toHaveBeenCalledWith(
      request,
      expect.objectContaining({
        sessionKey: 'notEligibleRecorded',
        record: recordJourneyNotEligible,
        logMessage: expect.stringContaining('not-eligible finish recorded')
      })
    )
  })
})
