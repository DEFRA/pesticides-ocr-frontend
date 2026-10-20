import { buildAnswers } from './build-answers.js'

describe('#buildAnswers', () => {
  test('Should map coded answers to the labels used on the question pages', () => {
    const answers = buildAnswers({
      businessActivities: ['selling', 'manufacturing'],
      addressActivities: ['store']
    })

    expect(answers.businessActivities).toEqual([
      'Selling PPPs',
      'Manufacturing PPPs'
    ])
    expect(answers.addressActivities).toEqual([
      'Store plant protection products (PPPs) or adjuvants'
    ])
  })

  test('Should label the exclusive only storing activity', () => {
    expect(buildAnswers({ businessActivities: ['only-storing'] }).businessActivities).toEqual([
      'Only storing PPPs for other businesses'
    ])
  })

  test('Should fall back to the raw value when it is not a known option', () => {
    const answers = buildAnswers({ businessActivities: ['unknown'] })

    expect(answers.businessActivities).toEqual(['unknown'])
  })

  test.each([
    ['own', 'Yes, at sites we own'],
    ['third-party', 'Yes, a third party stores them for us'],
    ['no', 'No, we don’t store PPPs']
  ])('Should map storing products %s to the label used on the question page', (storing, label) => {
    expect(buildAnswers({ usingPPPs: { storing } }).storing).toEqual([label])
  })

  test.each([
    ['main-address', 'Only at the main business address'],
    ['main-and-other', 'At the main business address and other locations']
  ])('Should map where products are stored %s to the label used on the question page', (storageLocation, label) => {
    expect(buildAnswers({ usingPPPs: { storageLocation } }).storageLocation).toEqual([label])
  })

  test('Should leave out where products are stored when it was not given', () => {
    expect(buildAnswers({ usingPPPs: { storing: 'no' } })).not.toHaveProperty('storageLocation')
  })

  test('Should leave out storing products when it was not given', () => {
    expect(buildAnswers({ usingPPPs: { whoApplies: 'self' } })).not.toHaveProperty('storing')
  })

  test.each([
    ['1-29', '1 to 29 litres or kilograms'],
    ['30-59', '30 to 59 litres or kilograms'],
    ['60-149', '60 to 149 litres or kilograms'],
    ['150-399', '150 to 399 litres or kilograms'],
    ['400-plus', '400 and over litres or kilograms']
  ])('Should read the quantity band %s back with its unit', (quantity, line) => {
    expect(buildAnswers({ usingPPPs: { quantity } }).usingQuantity).toEqual([line])
  })

  test('Should leave out the quantity when it was not given', () => {
    expect(buildAnswers({ usingPPPs: { storing: 'no' } })).not.toHaveProperty('usingQuantity')
  })

  test('Should flatten an address into one line per part, skipping the optional ones', () => {
    const answers = buildAnswers({
      address: {
        addressLine1: 'Highfield Farm',
        addressLine2: '',
        addressTown: 'Farm town',
        addressCounty: '',
        addressPostcode: 'PH1 1FT'
      }
    })

    expect(answers.address).toEqual(['Highfield Farm', 'Farm town', 'PH1 1FT'])
  })

  test('Should end an address with its region', () => {
    const answers = buildAnswers({
      address: {
        addressLine1: '1 High Street',
        addressLine2: '',
        addressTown: 'Edinburgh',
        addressPostcode: 'EH1 1AA',
        addressRegion: 'scotland'
      }
    })

    expect(answers.address).toEqual(['1 High Street', 'Edinburgh', 'EH1 1AA', 'Scotland'])
  })

  test('Should split the contact details into separate answers', () => {
    const answers = buildAnswers({
      primaryContact: {
        contactName: 'John Smith',
        contactTelephone: '01234 567890',
        contactEmail: 'john.smith@pesticides.co.uk'
      }
    })

    expect(answers.contactName).toEqual(['John Smith'])
    expect(answers.contactTelephone).toEqual(['01234 567890'])
    expect(answers.contactEmail).toEqual(['john.smith@pesticides.co.uk'])
  })

  test('Should include the contact job title or role when one was given', () => {
    const answers = buildAnswers({
      primaryContact: { contactName: 'John Smith', contactJobTitle: 'Farm manager' }
    })

    expect(answers.contactJobTitle).toEqual(['Farm manager'])
  })

  test('Should leave out the contact job title or role when it was left empty or not given', () => {
    expect(
      buildAnswers({ primaryContact: { contactName: 'John Smith', contactJobTitle: '' } })
    ).not.toHaveProperty('contactJobTitle')
    expect(
      buildAnswers({ primaryContact: { contactName: 'John Smith' } })
    ).not.toHaveProperty('contactJobTitle')
  })

  test('Should leave out every unanswered question', () => {
    expect(buildAnswers()).toEqual({})
  })

  test('Should only return the questions that have an answer', () => {
    const answers = buildAnswers({
      businessName: 'Pesticides Ltd',
      address: { addressLine2: '' }
    })

    expect(answers).toEqual({ businessName: ['Pesticides Ltd'] })
  })

  test('Should map who applies PPPs to the label used on the question page', () => {
    expect(buildAnswers({ usingPPPs: { whoApplies: 'self' } }).whoApplies).toEqual([
      'We apply PPPs ourselves or on behalf of other organisations'
    ])
    expect(buildAnswers({ usingPPPs: { whoApplies: 'contractor' } }).whoApplies).toEqual([
      'Another organisation applies PPPs on our behalf'
    ])
    expect(buildAnswers({})).not.toHaveProperty('whoApplies')
  })

  test('Should give the contractor name and address, the address ending with its region', () => {
    const answers = buildAnswers({
      usingPPPs: {
        whoApplies: 'contractor',
        contractor: {
          contractorName: 'Spray Contractors Ltd',
          address: {
            addressLine1: '1 High Street',
            addressLine2: '',
            addressTown: 'York',
            addressPostcode: 'YO1 7HH',
            addressRegion: 'scotland'
          }
        }
      }
    })

    expect(answers.contractorName).toEqual(['Spray Contractors Ltd'])
    expect(answers.contractorAddress).toEqual(['1 High Street', 'York', 'YO1 7HH', 'Scotland'])
  })

  test('Should leave out the contractor when none was given', () => {
    const answers = buildAnswers({ usingPPPs: { whoApplies: 'self' } })

    expect(answers).not.toHaveProperty('contractorName')
    expect(answers).not.toHaveProperty('contractorAddress')
  })

  test('Should show None when no member scheme was chosen', () => {
    expect(buildAnswers({ memberSchemes: [] }).memberSchemes).toEqual(['None'])
  })

  test('Should show None for an older session that saved an empty scheme', () => {
    expect(buildAnswers({ memberSchemes: [undefined] }).memberSchemes).toEqual(['None'])
  })

  test('Should map the PPP sectors to the labels used on the question page', () => {
    const answers = buildAnswers({
      usingPPPs: { professionalSectors: ['agriculture', 'business-premises', 'public-services'] }
    })

    expect(answers.professionalSectors).toEqual([
      'Agriculture',
      'Business premises',
      'Public Services and Local Authorities'
    ])
  })

  test('Should give the Other text as the PPP sectors when no sector was chosen', () => {
    expect(
      buildAnswers({ usingPPPs: { professionalSectors: ['Vineyard management'] } }).professionalSectors
    ).toEqual(['Vineyard management'])
  })

  test('Should leave out the PPP sectors when they were not given', () => {
    expect(buildAnswers({ usingPPPs: { whoApplies: 'self' } })).not.toHaveProperty('professionalSectors')
  })

  test('Should map the member schemes to the labels used on the question page', () => {
    const answers = buildAnswers({
      memberSchemes: ['red-tractor', 'sqc']
    })

    expect(answers.memberSchemes).toEqual([
      'Red Tractor',
      'Scottish Quality Crops (SQC)'
    ])
  })

  test('Should shape every additional address the same way as the main one', () => {
    const answers = buildAnswers({
      additionalAddresses: [
        {
          address: {
            addressLine1: 'Lowfield Farm',
            addressLine2: '',
            addressTown: 'Leeds',
            addressCounty: '',
            addressPostcode: 'LS1 1AA'
          },
          contact: {
            contactName: 'Jane Doe',
            contactTelephone: '01111 222333',
            contactEmail: 'jane.doe@pesticides.co.uk'
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
      additionalAddresses: [
        { address: { addressLine1: 'Highfield Farm' } },
        { address: { addressLine1: 'Lowfield Farm' } }
      ]
    })

    expect(answers.additionalAddresses).toHaveLength(2)
    expect(answers.additionalAddresses[0].address).toEqual(['Highfield Farm'])
    expect(answers.additionalAddresses[1].address).toEqual(['Lowfield Farm'])
  })

  test('Should leave out every unanswered part of an additional address', () => {
    const answers = buildAnswers({
      additionalAddresses: [{}, { contact: { contactName: 'Jane Doe' } }]
    })

    expect(answers.additionalAddresses).toEqual([{}, { contactName: ['Jane Doe'] }])
  })

  test('Should leave out the additional addresses when none were added', () => {
    expect(buildAnswers({}).additionalAddresses).toBeUndefined()
    expect(buildAnswers({ additionalAddresses: [] }).additionalAddresses).toBeUndefined()
  })
})
