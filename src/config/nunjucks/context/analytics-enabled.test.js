import { vi } from 'vitest'

const mockAnalyticsEnabled = vi.fn()

vi.mock(import('#/config/config.js'), async (importOriginal) => {
  const originalModule = await importOriginal()
  return {
    config: {
      get(key) {
        if (key === 'analytics.enabled') return mockAnalyticsEnabled()
        return originalModule.config.get(key)
      }
    }
  }
})

const { analyticsEnabledFor } = await import('./analytics-enabled.js')

describe('#analyticsEnabledFor', () => {
  describe('when analytics is enabled', () => {
    beforeEach(() => mockAnalyticsEnabled.mockReturnValue(true))

    test.each(['/', '/business-activities', '/not-eligible', '/cookies'])(
      'is on for the public page %s',
      (path) => {
        expect(analyticsEnabledFor(path)).toBe(true)
      }
    )

    test.each([
      '/search',
      '/search/export',
      '/dashboard',
      '/auth/entra/sign-in',
      '/auth/account'
    ])('is off for the case-officer page %s', (path) => {
      expect(analyticsEnabledFor(path)).toBe(false)
    })

    test.each(['/SEARCH', '/Search/Export', '//search', '/DASHBOARD'])(
      'is off for the case-officer variant %s',
      (path) => {
        expect(analyticsEnabledFor(path)).toBe(false)
      }
    )

    test('only matches whole path segments', () => {
      expect(analyticsEnabledFor('/searching')).toBe(true)
    })
  })

  test('is off everywhere when analytics is disabled', () => {
    mockAnalyticsEnabled.mockReturnValue(false)

    expect(analyticsEnabledFor('/')).toBe(false)
  })
})
