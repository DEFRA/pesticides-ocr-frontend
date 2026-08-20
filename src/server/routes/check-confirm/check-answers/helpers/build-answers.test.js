import { buildAnswers } from './build-answers.js'

describe('#buildAnswers', () => {
  test('Should map coded answers to the labels used on the question pages', () => {
    const answers = buildAnswers({
      'business-activities': ['seller-amateur', 'manufacture'],
      'address-activities': ['store'],
      'main-customer': 'both'
    })

    expect(answers.businessActivities).toEqual([
      'Sell amateur PPPs',
      'Manufacture, process or import'
    ])
    expect(answers.addressActivities).toEqual([
      'Store plant protection products (PPPs) or adjuvants'
    ])
    expect(answers.mainCustomer).toEqual(['Both professional and amateur users'])
  })

  test('Should fall back to the raw value when it is not a known option', () => {
    const answers = buildAnswers({ 'main-customer': 'unknown' })

    expect(answers.mainCustomer).toEqual(['unknown'])
  })

  test('Should read the quantity back in the unit it was given in', () => {
    const area = buildAnswers({
      quantity: { 'quantity-type': 'area', quantity: '67' }
    })
    const amount = buildAnswers({
      quantity: { 'quantity-type': 'amount', quantity: '80000' }
    })

    expect(area.quantity).toEqual(['67 hectares'])
    expect(amount.quantity).toEqual(['80000 litres or kilograms'])
  })

  test('Should pass the quantity type through for the page to title the row by', () => {
    const area = buildAnswers({
      quantity: { 'quantity-type': 'area', quantity: '67' }
    })

    expect(area.quantityType).toBe('area')
    expect(buildAnswers({}).quantityType).toBeUndefined()
  })

  test('Should flatten an address into one line per part, skipping the optional ones', () => {
    const answers = buildAnswers({
      address: {
        'address-line-1': 'Highfield Farm',
        'address-line-2': '',
        'address-town': 'Farm town',
        'address-county': '',
        'address-postcode': 'PH1 1FT'
      }
    })

    expect(answers.address).toEqual(['Highfield Farm', 'Farm town', 'PH1 1FT'])
  })

  test('Should split the contact details into separate answers', () => {
    const answers = buildAnswers({
      'primary-contact': {
        'contact-name': 'John Smith',
        'contact-telephone': '01234 567890',
        'contact-email': 'john.smith@pesticides.co.uk'
      }
    })

    expect(answers.contactName).toEqual(['John Smith'])
    expect(answers.contactTelephone).toEqual(['01234 567890'])
    expect(answers.contactEmail).toEqual(['john.smith@pesticides.co.uk'])
  })

  test('Should give every unanswered question an empty list', () => {
    expect(buildAnswers()).toEqual({
      businessActivities: [],
      mainCustomer: [],
      businessName: [],
      address: [],
      contactName: [],
      contactTelephone: [],
      contactEmail: [],
      addressActivities: [],
      quantity: [],
      quantityType: undefined,
      professionalSectors: [],
      memberSchemes: [],
      additionalAddresses: []
    })
  })

  test('Should map the professional answers to the labels used on the question pages', () => {
    const answers = buildAnswers({
      'professional-sectors': ['agriculture-horticulture', 'forestry'],
      'member-schemes': ['red-tractor', 'sqc']
    })

    expect(answers.professionalSectors).toEqual([
      'Agriculture and horticulture',
      'Forestry'
    ])
    expect(answers.memberSchemes).toEqual([
      'Red Tractor',
      'Scottish Quality Crops (SQC)'
    ])
  })

  test('Should shape every additional address the same way as the main one', () => {
    const answers = buildAnswers({
      'additional-addresses': [
        {
          address: {
            'address-line-1': 'Lowfield Farm',
            'address-line-2': '',
            'address-town': 'Leeds',
            'address-county': '',
            'address-postcode': 'LS1 1AA'
          },
          contact: {
            'contact-name': 'Jane Doe',
            'contact-telephone': '01111 222333',
            'contact-email': 'jane.doe@pesticides.co.uk'
          },
          activity: ['store', 'records']
        }
      ]
    })

    expect(answers.additionalAddresses).toEqual([
      {
        address: ['Lowfield Farm', 'Leeds', 'LS1 1AA'],
        contactName: ['Jane Doe'],
        contactTelephone: ['01111 222333'],
        contactEmail: ['jane.doe@pesticides.co.uk'],
        activity: [
          'Store plant protection products (PPPs) or adjuvants',
          'Keep records of plant protection products (PPPs)'
        ]
      }
    ])
  })

  test('Should keep the additional addresses in the order they were added', () => {
    const answers = buildAnswers({
      'additional-addresses': [
        { address: { 'address-line-1': 'Highfield Farm' } },
        { address: { 'address-line-1': 'Lowfield Farm' } }
      ]
    })

    expect(answers.additionalAddresses).toHaveLength(2)
    expect(answers.additionalAddresses[0].address).toEqual(['Highfield Farm'])
    expect(answers.additionalAddresses[1].address).toEqual(['Lowfield Farm'])
  })

  test('Should give every unanswered part of an additional address an empty list', () => {
    const answers = buildAnswers({ 'additional-addresses': [{}] })

    expect(answers.additionalAddresses).toEqual([
      {
        address: [],
        contactName: [],
        contactTelephone: [],
        contactEmail: [],
        activity: []
      }
    ])
  })

  test('Should give an empty list when the additional address loop was never entered', () => {
    expect(buildAnswers({}).additionalAddresses).toEqual([])
    expect(buildAnswers().additionalAddresses).toEqual([])
    expect(buildAnswers({ 'additional-addresses': [] }).additionalAddresses).toEqual([])
  })
})
