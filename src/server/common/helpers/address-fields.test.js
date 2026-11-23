import Joi from 'joi'

import { addressFields, requiredText, ukPostcode } from './address-fields.js'

describe('#addressFields', () => {
  const schema = Joi.object(addressFields({ addressLine1Message: 'Enter the first line' }))

  const address = {
    addressLine1: '1 High Street',
    addressLine2: 'Flat 2',
    addressTown: 'York',
    addressPostcode: 'YO1 7HH',
    addressRegion: 'england'
  }

  const messagesFor = (payload) =>
    (schema.validate(payload, { abortEarly: false }).error?.details ?? []).map(({ path, message }) => [
      path.join('.'),
      message
    ])

  test('Should accept a full address, trimming the text', () => {
    const { value, error } = schema.validate({ ...address, addressLine1: ' 1 High Street ' })

    expect(error).toBeUndefined()
    expect(value).toEqual(address)
  })

  test('Should accept an empty second line', () => {
    expect(schema.validate({ ...address, addressLine2: '' }).error).toBeUndefined()
  })

  test.each(['england', 'scotland', 'wales'])('Should accept the %s region', (addressRegion) => {
    expect(schema.validate({ ...address, addressRegion }).error).toBeUndefined()
  })

  test('Should use the message the page gives for address line 1', () => {
    expect(messagesFor({ ...address, addressLine1: '   ' })).toEqual([['addressLine1', 'Enter the first line']])
    expect(
      Joi.object(addressFields({ addressLine1Message: 'Enter address line 1' }))
        .validate({ ...address, addressLine1: '' })
        .error.message
    ).toBe('Enter address line 1')
  })

  test('Should give a message for every required field left out', () => {
    expect(messagesFor({})).toEqual([
      ['addressLine1', 'Enter the first line'],
      ['addressTown', 'Enter town or city'],
      ['addressPostcode', 'Enter a postcode'],
      ['addressRegion', 'Select a country']
    ])
  })

  test.each(['', 'france'])('Should ask for a country given the region %o', (addressRegion) => {
    expect(schema.validate({ ...address, addressRegion }).error.message).toBe('Select a country')
  })
})

describe('#ukPostcode', () => {
  test.each(['YO1 7HH', 'yo17hh', 'SW1A 1AA', ' LS1 1AA '])('Should accept %o', (postcode) => {
    expect(ukPostcode.validate(postcode).error).toBeUndefined()
  })

  test.each([
    ['', 'Enter a postcode'],
    ['   ', 'Enter a postcode'],
    ['not a postcode', 'Enter a real postcode'],
    ['AA3', 'Enter a real postcode']
  ])('Should reject %o with %o', (postcode, message) => {
    expect(ukPostcode.validate(postcode).error.message).toBe(message)
  })
})

describe('#requiredText', () => {
  test('Should trim the text and give the message when nothing is left', () => {
    const rule = requiredText('Enter a name')

    expect(rule.validate(' Jo ').value).toBe('Jo')
    expect(rule.validate('  ').error.message).toBe('Enter a name')
    expect(Joi.object({ name: rule }).validate({}).error.message).toBe('Enter a name')
  })
})
