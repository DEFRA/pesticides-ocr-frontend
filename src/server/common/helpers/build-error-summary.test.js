import { buildErrorSummary } from './build-error-summary.js'

describe('#buildErrorSummary', () => {
  test('Should return an empty summary when there is no error', () => {
    expect(buildErrorSummary(null)).toEqual({})
    expect(buildErrorSummary(undefined)).toEqual({})
  })

  test('Should build an error map and list from Joi-style error details', () => {
    const error = {
      details: [
        { path: ['name'], message: 'Enter your name' },
        { path: ['address', 'postcode'], message: 'Enter a postcode' }
      ]
    }

    const result = buildErrorSummary(error)

    expect(result.errors).toEqual({
      name: { text: 'Enter your name' },
      'address.postcode': { text: 'Enter a postcode' }
    })
    expect(result.errorList).toEqual([
      { text: 'Enter your name', href: '#name' },
      { text: 'Enter a postcode', href: '#address.postcode' }
    ])
  })

  test('Should treat an array of details as the error itself', () => {
    const error = [{ path: ['field'], message: 'Required' }]

    const result = buildErrorSummary(error)

    expect(result.errors).toEqual({ field: { text: 'Required' } })
    expect(result.errorList).toEqual([{ text: 'Required', href: '#field' }])
  })

  test('Should keep only the first message for a repeated field path', () => {
    const error = {
      details: [
        { path: ['field'], message: 'First message' },
        { path: ['field'], message: 'Second message' }
      ]
    }

    const result = buildErrorSummary(error)

    expect(result.errors).toEqual({ field: { text: 'First message' } })
    expect(result.errorList).toEqual([{ text: 'First message', href: '#field' }])
  })
})
