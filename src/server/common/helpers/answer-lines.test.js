import {
  addressLines,
  businessAddressLines,
  internationalAddressLines,
  isInternationalAddress,
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

    test('Should end an address with the label of its region', () => {
      expect(
        addressLines({
          addressLine1: '1 High Street',
          addressLine2: '',
          addressTown: 'Cardiff',
          addressPostcode: 'CF10 1AA',
          addressRegion: 'wales'
        })
      ).toEqual(['1 High Street', 'Cardiff', 'CF10 1AA', 'Wales'])
    })

    test('Should return nothing when no address is held', () => {
      expect(addressLines()).toEqual([])
    })
  })
})

describe('#isInternationalAddress', () => {
  test('Should be true for an address typed in as text', () => {
    expect(isInternationalAddress({ internationalAddress: 'Rue de la Paix 12' })).toBe(true)
  })

  test.each([[{ addressLine1: '1 Barn Lane' }], [{}], [undefined]])(
    'Should be false for %o',
    (address) => {
      expect(isInternationalAddress(address)).toBe(false)
    }
  )
})

describe('#internationalAddressLines', () => {
  test('Should give one trimmed line per line typed, dropping blank ones', () => {
    expect(internationalAddressLines('Rue de la Paix 12\r\n\n  75002 Paris  \nFrance\n')).toEqual([
      'Rue de la Paix 12',
      '75002 Paris',
      'France'
    ])
  })

  test('Should give no lines when nothing was typed', () => {
    expect(internationalAddressLines()).toEqual([])
  })
})

describe('#businessAddressLines', () => {
  test('Should give the lines of an international address', () => {
    expect(businessAddressLines({ internationalAddress: 'Rue de la Paix 12\nFrance' })).toEqual([
      'Rue de la Paix 12',
      'France'
    ])
  })

  test('Should give the lines of an address in Great Britain', () => {
    expect(
      businessAddressLines({
        addressLine1: '1 Barn Lane',
        addressTown: 'York',
        addressPostcode: 'YO1 7HH',
        addressRegion: 'england'
      })
    ).toEqual(['1 Barn Lane', 'York', 'YO1 7HH', 'England'])
  })

  test('Should give no lines when no address was given', () => {
    expect(businessAddressLines()).toEqual([])
  })
})
