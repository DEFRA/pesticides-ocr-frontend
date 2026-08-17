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
      quantityType: undefined
    })
  })
})
