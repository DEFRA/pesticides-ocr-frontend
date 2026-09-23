import { toOperatorView } from './registration-mapper.js'

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

describe('toOperatorView', () => {
  test('maps stored fields onto the Operator contract', () => {
    expect(toOperatorView(storedDoc)).toEqual({
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
    const operator = toOperatorView({
      ...storedDoc,
      submittedAt: new Date('2026-03-11T09:30:00.000Z')
    })

    expect(operator.registeredDate).toBe('2026-03-11')
  })

  test('formats an area quantity as hectares', () => {
    const operator = toOperatorView({
      ...storedDoc,
      quantity: { quantityType: 'area', quantity: 1500 }
    })

    expect(operator.quantity).toBe('1,500 hectares')
  })

  test('prefers a stored mainCustomer/status/country when present', () => {
    const operator = toOperatorView({
      ...storedDoc,
      mainCustomer: 'Professional users',
      status: 'Suspended',
      address: { ...storedDoc.address, addressCountry: 'England' }
    })

    expect(operator.mainCustomer).toBe('Professional users')
    expect(operator.status).toBe('Suspended')
    expect(operator.address.country).toBe('England')
  })

  test('falls back to the raw slug for an unknown activity code', () => {
    const operator = toOperatorView({
      ...storedDoc,
      businessActivities: ['manufacture', 'some-new-code']
    })

    expect(operator.activities).toEqual([
      'Manufacture, process or import',
      'some-new-code'
    ])
  })

  test('tolerates a sparse document without throwing', () => {
    const operator = toOperatorView({ reference: 'PPP-ZZZ-999' })

    expect(operator.reference).toBe('PPP-ZZZ-999')
    expect(operator.businessName).toBe('')
    expect(operator.activities).toEqual([])
    expect(operator.addressActivities).toEqual([])
    expect(operator.quantity).toBe('')
    expect(operator.registeredDate).toBe('')
    expect(operator.address).toEqual({
      line1: '',
      town: '',
      postcode: '',
      country: ''
    })
    expect(operator.contact).toEqual({ name: '', email: '', telephone: '' })
    expect(operator.status).toBe('Registered')
  })

  test('tolerates being called with nothing at all', () => {
    expect(() => toOperatorView()).not.toThrow()
  })

  test('leaves the date empty when it is unparseable', () => {
    expect(toOperatorView({ submittedAt: 'not-a-date' }).registeredDate).toBe('')
  })

  test('omits stored fields not in the Operator contract', () => {
    const operator = toOperatorView({
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

    expect(operator.address).not.toHaveProperty('line2')
    expect(operator.address).not.toHaveProperty('county')
    expect(operator).not.toHaveProperty('professionalSectors')
    expect(operator).not.toHaveProperty('memberSchemes')
    expect(operator).not.toHaveProperty('additionalAddresses')
  })
})
