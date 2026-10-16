import {
  additionalAddressLines,
  addressLines,
  labelsFor,
  toLines
} from './answer-lines.js'

describe('#answerLines', () => {
  describe('#toLines', () => {
    test('Should skip empty and missing values', () => {
      expect(toLines('Jo', '', undefined, 'Bloggs')).toEqual(['Jo', 'Bloggs'])
    })
  })

  describe('#labelsFor', () => {
    const items = [
      { value: 'store', text: 'Store PPPs' },
      { value: 'use', text: 'Use PPPs' }
    ]

    test('Should map each value to its item label', () => {
      expect(labelsFor(items, ['use', 'store'])).toEqual(['Use PPPs', 'Store PPPs'])
    })

    test('Should accept a single value', () => {
      expect(labelsFor(items, 'store')).toEqual(['Store PPPs'])
    })

    test('Should keep a value with no matching item as it is', () => {
      expect(labelsFor(items, ['Local scheme'])).toEqual(['Local scheme'])
    })

    test('Should return nothing when no values are held', () => {
      expect(labelsFor(items, undefined)).toEqual([])
      expect(labelsFor(items, ['', undefined])).toEqual([])
    })
  })

  describe('#addressLines', () => {
    test('Should give one line per answered part of the address', () => {
      expect(
        addressLines({
          addressLine1: 'Highfield Farm',
          addressLine2: '',
          addressTown: 'Farm town',
          addressPostcode: 'PH1 1FT'
        })
      ).toEqual(['Highfield Farm', 'Farm town', 'PH1 1FT'])
    })

    test('Should return nothing when no address is held', () => {
      expect(addressLines()).toEqual([])
    })
  })

  describe('#additionalAddressLines', () => {
    test('Should describe every part of an additional address', () => {
      expect(
        additionalAddressLines({
          address: { addressLine1: 'Highfield Farm', addressTown: 'Farm town' },
          contact: {
            contactName: 'John Smith',
            contactEmail: 'john.smith@pesticides.co.uk',
            contactTelephone: '01234 567890'
          },
          activity: ['store']
        })
      ).toEqual({
        address: ['Highfield Farm', 'Farm town'],
        contactName: ['John Smith'],
        contactEmail: ['john.smith@pesticides.co.uk'],
        contactTelephone: ['01234 567890'],
        activity: ['Store plant protection products (PPPs) or adjuvants']
      })
    })

    test('Should give every unanswered field an empty list', () => {
      expect(additionalAddressLines()).toEqual({
        address: [],
        contactName: [],
        contactEmail: [],
        contactTelephone: [],
        activity: []
      })
    })
  })
})
