import { annualQuantityPayload } from './annual-quantity.js'

const enterMessage = 'Enter the estimated annual quantity'
const notPositiveMessage = 'Estimated annual quantity must be a number greater than 0'
const tooLargeMessage = 'Estimated annual quantity is too large. Check you have entered it correctly'
const decimalPlacesMessage = 'Estimated annual quantity must have no more than 2 decimal places'

describe('#annualQuantity', () => {
  const validate = (payload) => annualQuantityPayload().validate(payload)

  test.each([
    ['300', 300],
    [' 300 ', 300],
    ['0.5', 0.5],
    ['0.07', 0.07],
    ['0.01', 0.01],
    ['12.5', 12.5]
  ])('Should accept %o as %o', (quantity, expected) => {
    const { error, value } = validate({ quantity })

    expect(error).toBeUndefined()
    expect(value.quantity).toBe(expected)
  })

  test.each([
    [{}, enterMessage],
    [{ quantity: '' }, enterMessage],
    [{ quantity: '   ' }, enterMessage],
    [{ quantity: 'lots' }, notPositiveMessage],
    [{ quantity: '0' }, notPositiveMessage],
    [{ quantity: '-5' }, notPositiveMessage],
    [{ quantity: '9007199254740993' }, tooLargeMessage],
    [{ quantity: '1e308' }, tooLargeMessage],
    [{ quantity: '0.0000001' }, decimalPlacesMessage],
    [{ quantity: '12.345' }, decimalPlacesMessage]
  ])('Should reject %o', (payload, message) => {
    const { error } = validate(payload)

    expect(error.details[0].message).toBe(message)
  })
})
