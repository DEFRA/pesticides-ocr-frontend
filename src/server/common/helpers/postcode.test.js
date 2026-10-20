import { formatPostcode } from './postcode.js'

describe('#formatPostcode', () => {
  test.each([
    ['AA3 1AB', 'AA3 1AB'],
    ['aa31ab', 'AA3 1AB'],
    ['  sw1a   1aa ', 'SW1A 1AA'],
    ['M11AE', 'M1 1AE']
  ])('Should format %o as %o', (postcode, expected) => {
    expect(formatPostcode(postcode)).toBe(expected)
  })

  test('Should return an empty string when there is no postcode', () => {
    expect(formatPostcode()).toBe('')
  })
})
