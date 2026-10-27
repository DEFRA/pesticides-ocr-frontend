import { describe, test, expect, vi } from 'vitest'

import { get } from './controller.js'

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

describe('#businessActivities GET', () => {
  test('seeds the form session', () => {
    const request = fakeRequest()

    get.handler(request, h)

    expect(request.yar.get('formSession')).toEqual({})
  })
})
