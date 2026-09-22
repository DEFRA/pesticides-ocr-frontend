import {
  buildErrorSummary,
  buildManualErrorSummary
} from './build-error-summary.js'

describe('#buildErrorSummary', () => {
  const detail = (path, message) => ({ path, message })

  test.each([undefined, null])(
    'Should build nothing when there is no error',
    (error) => {
      expect(buildErrorSummary(error)).toEqual({})
    }
  )

  test('Should build an entry per field and a matching summary list', () => {
    const error = {
      details: [
        detail(['businessName'], 'Enter the business name'),
        detail(['addressPostcode'], 'Enter the postcode')
      ]
    }

    expect(buildErrorSummary(error)).toEqual({
      errors: {
        businessName: { text: 'Enter the business name' },
        addressPostcode: { text: 'Enter the postcode' }
      },
      errorList: [
        { text: 'Enter the business name', href: '#businessName' },
        { text: 'Enter the postcode', href: '#addressPostcode' }
      ]
    })
  })

  // Joi hands over an error with details, but the helper also takes the
  // details array on its own.
  test('Should read a bare details array as the details', () => {
    const details = [detail(['businessName'], 'Enter the business name')]

    expect(buildErrorSummary(details)).toEqual(buildErrorSummary({ details }))
  })

  test('Should keep only the first message for a field', () => {
    const error = {
      details: [
        detail(['businessName'], 'Enter the business name'),
        detail(['businessName'], 'Business name must be 100 characters or less')
      ]
    }

    const { errors, errorList } = buildErrorSummary(error)

    expect(errors.businessName).toEqual({ text: 'Enter the business name' })
    expect(errorList).toEqual([
      { text: 'Enter the business name', href: '#businessName' }
    ])
  })

  test('Should join a nested path into a single key and href', () => {
    const error = {
      details: [detail(['address', 'postcode'], 'Enter the postcode')]
    }

    const { errors, errorList } = buildErrorSummary(error)

    expect(errors['address.postcode']).toEqual({ text: 'Enter the postcode' })
    expect(errorList[0].href).toBe('#address.postcode')
  })

  test('Should build an empty summary when there are no details', () => {
    expect(buildErrorSummary({ details: [] })).toEqual({
      errors: {},
      errorList: []
    })
  })
})

describe('#buildManualErrorSummary', () => {
  const payload = (error, message) => ({ error, message })

  test.each([undefined, null])(
    'Should build nothing when nothing was thrown',
    (thrownError) => {
      expect(buildManualErrorSummary(thrownError)).toEqual({})
    }
  )

  // Boom payloads are keyed by their error name rather than a form field, so
  // the summary links to the top of the page rather than to an input.
  test('Should list the message of each thrown error against the page itself', () => {
    const thrown = [
      payload('Bad Request', 'Invalid reference number'),
      payload('Service Unavailable', 'Search API unavailable')
    ]

    expect(buildManualErrorSummary(thrown).errorList).toEqual([
      { text: 'Invalid reference number', href: '#' },
      { text: 'Search API unavailable', href: '#' }
    ])
  })

  // The field-level entry carries the error name, not the message; only
  // errorList is read by the search controller today.
  test('Should key the field-level entries by the error name', () => {
    const thrown = [payload('Bad Request', 'Invalid reference number')]

    expect(buildManualErrorSummary(thrown).errors).toEqual({
      'Bad Request': { text: 'Bad Request' }
    })
  })

  test('Should keep only the first error of a kind', () => {
    const thrown = [
      payload('Bad Request', 'Invalid reference number'),
      payload('Bad Request', 'Reference number is too long')
    ]

    expect(buildManualErrorSummary(thrown).errorList).toEqual([
      { text: 'Invalid reference number', href: '#' }
    ])
  })

  test('Should build an empty summary when nothing was listed', () => {
    expect(buildManualErrorSummary([])).toEqual({ errors: {}, errorList: [] })
  })
})
