import { toRegistrationView } from './registration-mapper.js'

// A representative stored registration, as the backend's /search returns it.
// Dates arrive as ISO strings over the wire rather than as Date objects.
const storedDoc = {
  reference: 'PPP-A1B-2C3',
  submittedAt: '2026-03-11T09:30:00.000Z',
  businessName: 'Pesticides Ltd',
  businessActivities: ['manufacture', 'market'],
  address: {
    addressLine1: 'Highfield Farm',
    addressLine2: '',
    addressTown: 'Farmtown',
    addressCounty: '',
    addressPostcode: 'PH1 1FT'
  },
  primaryContact: {
    contactName: 'John Smith',
    contactTelephone: '01234 567890',
    contactEmail: 'john.smith@pesticides.co.uk'
  },
  addressActivities: ['use', 'store'],
  quantity: { quantityType: 'amount', quantity: 80000 }
}

describe('toRegistrationView', () => {
  test('maps stored fields onto a RegistrationView', () => {
    expect(toRegistrationView(storedDoc)).toEqual({
      reference: 'PPP-A1B-2C3',
      businessName: 'Pesticides Ltd',
      activities: [
        'Manufacture, process or import',
        'Place on the market or distribute'
      ],
      mainCustomer: 'N/A',
      address: {
        line1: 'Highfield Farm',
        town: 'Farmtown',
        postcode: 'PH1 1FT',
        country: ''
      },
      contact: {
        name: 'John Smith',
        email: 'john.smith@pesticides.co.uk',
        telephone: '01234 567890'
      },
      addressActivities: [
        'Use plant protection products (PPPs) or adjuvants',
        'Store plant protection products (PPPs) or adjuvants'
      ],
      quantity: '80,000 litres or kilograms',
      registeredDate: '2026-03-11',
      status: 'Registered'
    })
  })

  test('accepts a Date as well as an ISO string for submittedAt', () => {
    const view = toRegistrationView({
      ...storedDoc,
      submittedAt: new Date('2026-03-11T09:30:00.000Z')
    })

    expect(view.registeredDate).toBe('2026-03-11')
  })

  test('formats an area quantity as hectares', () => {
    const view = toRegistrationView({
      ...storedDoc,
      quantity: { quantityType: 'area', quantity: 1500 }
    })

    expect(view.quantity).toBe('1,500 hectares')
  })

  // The seed data (and anything else written straight to the database) stores
  // the quantity as the string the form submitted.
  test('formats a quantity stored as a numeric string', () => {
    const view = toRegistrationView({
      ...storedDoc,
      quantity: { quantityType: 'amount', quantity: '80000' }
    })

    expect(view.quantity).toBe('80,000 litres or kilograms')
  })

  test.each([
    ['an empty string', ''],
    ['whitespace', '   '],
    ['a non-numeric string', 'lots'],
    ['a hex string', '0x10'],
    ['an exponent string', '1e3'],
    ['NaN', Number.NaN],
    ['Infinity', Infinity],
    ['null', null]
  ])('leaves the quantity empty for %s', (_description, value) => {
    const view = toRegistrationView({
      ...storedDoc,
      quantity: { quantityType: 'amount', quantity: value }
    })

    expect(view.quantity).toBe('')
  })

  test('uses the journey label for every business activity', () => {
    const view = toRegistrationView({
      ...storedDoc,
      businessActivities: ['use-professional', 'seller-amateur']
    })

    expect(view.activities).toEqual([
      'Use professional PPPs as part of work',
      'Sell amateur PPPs'
    ])
  })

  test.each([
    ['professional', 'Professional user'],
    ['amateur', 'Amateur user'],
    ['both', 'Both professional and amateur users']
  ])('labels a stored mainCustomer of %s', (code, label) => {
    expect(toRegistrationView({ ...storedDoc, mainCustomer: code }).mainCustomer).toBe(
      label
    )
  })

  test.each([
    ['missing', undefined],
    ['empty', '']
  ])('shows N/A when mainCustomer is %s', (_description, value) => {
    expect(
      toRegistrationView({ ...storedDoc, mainCustomer: value }).mainCustomer
    ).toBe('N/A')
  })

  test('falls back to the raw value for an unknown mainCustomer', () => {
    expect(
      toRegistrationView({ ...storedDoc, mainCustomer: 'wholesale' }).mainCustomer
    ).toBe('wholesale')
  })

  test('prefers a stored status/country when present', () => {
    const view = toRegistrationView({
      ...storedDoc,
      status: 'Suspended',
      address: { ...storedDoc.address, addressCountry: 'England' }
    })

    expect(view.status).toBe('Suspended')
    expect(view.address.country).toBe('England')
  })

  test('falls back to the raw slug for an unknown activity code', () => {
    const view = toRegistrationView({
      ...storedDoc,
      businessActivities: ['manufacture', 'some-new-code']
    })

    expect(view.activities).toEqual([
      'Manufacture, process or import',
      'some-new-code'
    ])
  })

  test('tolerates a sparse document without throwing', () => {
    const view = toRegistrationView({ reference: 'PPP-ZZZ-999' })

    expect(view.reference).toBe('PPP-ZZZ-999')
    expect(view.businessName).toBe('')
    expect(view.activities).toEqual([])
    expect(view.addressActivities).toEqual([])
    expect(view.quantity).toBe('')
    expect(view.registeredDate).toBe('')
    expect(view.address).toEqual({
      line1: '',
      town: '',
      postcode: '',
      country: ''
    })
    expect(view.contact).toEqual({ name: '', email: '', telephone: '' })
    expect(view.status).toBe('Registered')
  })

  test('tolerates being called with nothing at all', () => {
    expect(() => toRegistrationView()).not.toThrow()
  })

  test('leaves the date empty when it is unparseable', () => {
    expect(toRegistrationView({ submittedAt: 'not-a-date' }).registeredDate).toBe('')
  })

  test('omits stored fields not in a RegistrationView', () => {
    const view = toRegistrationView({
      ...storedDoc,
      address: {
        ...storedDoc.address,
        addressLine2: 'Unit 2',
        addressCounty: 'Surrey'
      },
      professionalSectors: ['forestry'],
      memberSchemes: ['Red Tractor'],
      additionalAddresses: [{ address: {}, contact: {}, activity: ['use'] }]
    })

    expect(view.address).not.toHaveProperty('line2')
    expect(view.address).not.toHaveProperty('county')
    expect(view).not.toHaveProperty('professionalSectors')
    expect(view).not.toHaveProperty('memberSchemes')
    expect(view).not.toHaveProperty('additionalAddresses')
  })
})
