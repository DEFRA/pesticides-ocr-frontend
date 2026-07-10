import { vi } from 'vitest'

vi.mock('@defra/hapi-tracing', () => ({
  getTraceId: vi.fn()
}))

describe('logger-options mixin', () => {
  let getTraceId
  let loggerOptions

  beforeEach(async () => {
    vi.resetModules()
    const hapiTracing = await import('@defra/hapi-tracing')
    getTraceId = hapiTracing.getTraceId
    const module = await import('./logger-options.js')
    loggerOptions = module.loggerOptions
  })

  test('Should include trace ID in mixin when available', () => {
    getTraceId.mockReturnValue('trace-123')

    const mixinResult = loggerOptions.mixin()

    expect(mixinResult).toEqual({
      trace: { id: 'trace-123' }
    })
  })

  test('Should return empty object when trace ID is not available', () => {
    getTraceId.mockReturnValue(null)

    const mixinResult = loggerOptions.mixin()

    expect(mixinResult).toEqual({})
  })

  test('Should return empty object when trace ID is undefined', () => {
    getTraceId.mockReturnValue(undefined)

    const mixinResult = loggerOptions.mixin()

    expect(mixinResult).toEqual({})
  })
})
