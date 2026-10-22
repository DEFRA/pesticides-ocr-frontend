import { toOperatorView } from './registration-mapper.js'

// A representative stored registration, as the backend's /search returns it.
// Dates arrive as ISO strings over the wire rather than as Date objects.
const storedDoc = {
  reference: 'PPP-A1B-2C3',
  submittedAt: '2026-03-11T09:30:00.000Z',
  businessName: 'Pesticides Ltd',
  businessActivities: ['manufacturing', 'distributing'],
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
  usingPPPs: { quantity: '60-149' }
}

describe('toOperatorView', () => {
  test('maps stored fields onto the Operator contract', () => {
    expect(toOperatorView(storedDoc)).toEqual({
      reference: 'PPP-A1B-2C3',
      businessName: 'Pesticides Ltd',
      activities: ['Manufacturing PPPs', 'Distributing PPPs'],
      address: {
        line1: 'Highfield Farm',
        town: 'Farmtown',
        postcode: 'PH1 1FT',
        region: ''
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
      quantity: '60 to 149 litres or kilograms',
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

  test.each([
    ['1-29', '1 to 29 litres or kilograms'],
    ['30-59', '30 to 59 litres or kilograms'],
    ['60-149', '60 to 149 litres or kilograms'],
    ['150-399', '150 to 399 litres or kilograms'],
    ['400-plus', '400 and over litres or kilograms']
  ])('shows the quantity band %s as its label with the unit', (band, quantity) => {
    expect(toOperatorView({ ...storedDoc, usingPPPs: { quantity: band } }).quantity).toBe(quantity)
  })

  test('falls back to the raw value for an unknown quantity band', () => {
    expect(toOperatorView({ ...storedDoc, usingPPPs: { quantity: '1000-plus' } }).quantity).toBe(
      '1000-plus'
    )
  })

  test('leaves the quantity empty when no quantity band is stored', () => {
    expect(toOperatorView({ ...storedDoc, usingPPPs: {} }).quantity).toBe('')
  })

  test('uses the journey label for every business activity', () => {
    const operator = toOperatorView({
      ...storedDoc,
      businessActivities: ['using', 'only-storing']
    })

    expect(operator.activities).toEqual([
      'Using PPPs as part of your work',
      'Only storing PPPs for other businesses'
    ])
  })

  test('prefers a stored status/region when present, shown as its label', () => {
    const operator = toOperatorView({
      ...storedDoc,
      status: 'Suspended',
      address: { ...storedDoc.address, addressRegion: 'england' }
    })

    expect(operator.status).toBe('Suspended')
    expect(operator.address.region).toBe('England')
  })

  test('falls back to the raw slug for an unknown activity code', () => {
    const operator = toOperatorView({
      ...storedDoc,
      businessActivities: ['manufacturing', 'some-new-code']
    })

    expect(operator.activities).toEqual(['Manufacturing PPPs', 'some-new-code'])
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
      region: ''
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
      mainCustomer: 'both',
      professionalSectors: ['forestry'],
      memberSchemes: ['Red Tractor'],
      additionalAddresses: [{ address: {}, contact: {}, activity: ['use'] }]
    })

    expect(operator.address).not.toHaveProperty('line2')
    expect(operator.address).not.toHaveProperty('county')
    expect(operator).not.toHaveProperty('mainCustomer')
    expect(operator).not.toHaveProperty('professionalSectors')
    expect(operator).not.toHaveProperty('memberSchemes')
    expect(operator).not.toHaveProperty('additionalAddresses')
  })
})
