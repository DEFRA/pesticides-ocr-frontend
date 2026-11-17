import { buildAnswers } from './build-answers.js'
import { SELLING, USING } from '#/server/routes/qualifying-questions/business-activities/items.js'

describe('#buildAnswers', () => {
  test('Should map coded answers to the labels used on the question pages', () => {
    const answers = buildAnswers({
      businessActivities: [SELLING, USING]
    })

    expect(answers.businessActivities).toEqual([
      'Seller of amateur plant protection products',
      'Using PPPs as part of your work'
    ])
  })

  test('Should fall back to the raw value when it is not a known option', () => {
    const answers = buildAnswers({ businessActivities: ['unknown'] })

    expect(answers.businessActivities).toEqual(['unknown'])
  })

  test.each([
    [['own'], ['At sites we own']],
    [['third-party'], ['By a third party on our behalf']],
    [['no'], ['We do not store PPPs']],
    [['own', 'third-party'], ['At sites we own', 'By a third party on our behalf']]
  ])('Should map storing products %o to the labels used on the question page', (storing, labels) => {
    expect(buildAnswers({ usingPPPs: { storing } }).storing).toEqual(labels)
  })

  test('Should give the main business address as a PPP store location when it is ticked', () => {
    expect(buildAnswers({ usingPPPs: { storageLocation: ['main-address'] } }).storeLocations).toEqual([
      { lines: ['At the main business address'], href: '/using-ppps/storage-location?change=true' }
    ])
  })

  test('Should give each storage address as a PPP store location, one line per address line', () => {
    expect(
      buildAnswers({
        usingPPPs: {
          storageLocation: ['another-address'],
          ownStorageAddresses: [
            { addressLine1: '1 Barn Lane', addressTown: 'York', addressPostcode: 'YO1 7HH', addressRegion: 'wales' },
            { addressLine1: '2 Mill Road', addressTown: 'Leeds', addressPostcode: 'LS1 1AA', addressRegion: 'england' }
          ]
        }
      }).storeLocations
    ).toEqual([
      { lines: ['1 Barn Lane', 'York', 'YO1 7HH', 'Wales'], href: '/using-ppps/storage-addresses?change=true' },
      { lines: ['2 Mill Road', 'Leeds', 'LS1 1AA', 'England'], href: '/using-ppps/storage-addresses?change=true' }
    ])
  })

  test('Should give the storage contact as one PPP store location, leaving out an empty job title', () => {
    expect(
      buildAnswers({
        usingPPPs: {
          storageContact: {
            contactName: 'Sam Store',
            businessName: 'Safe Storage Ltd',
            contactJobTitle: '',
            contactTelephone: '01234 567890',
            contactEmail: 'sam@example.com'
          }
        }
      }).storeLocations
    ).toEqual([
      {
        lines: ['Sam Store', 'Safe Storage Ltd', '01234 567890', 'sam@example.com'],
        href: '/using-ppps/third-party-storage-contact?change=true'
      }
    ])
  })

  test('Should list the PPP store locations as the pages ask them: main address, other addresses, then the third party', () => {
    const locations = buildAnswers({
      usingPPPs: {
        storageLocation: ['main-address', 'another-address'],
        ownStorageAddresses: [{ addressLine1: '1 Barn Lane' }],
        storageContact: { contactName: 'Sam Store', contactJobTitle: 'Manager', businessName: 'Safe Storage Ltd' }
      }
    }).storeLocations

    expect(locations.map(({ lines }) => lines)).toEqual([
      ['At the main business address'],
      ['1 Barn Lane'],
      ['Sam Store', 'Manager', 'Safe Storage Ltd']
    ])
  })

  test('Should leave out the PPP store locations when none were given', () => {
    expect(buildAnswers({ usingPPPs: { storing: ['no'] } })).not.toHaveProperty('storeLocations')
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
    expect(buildAnswers({ usingPPPs: { memberSchemes: [] } }).memberSchemes).toEqual(['None'])
  })

  test('Should show None for an older session that saved an empty scheme', () => {
    expect(buildAnswers({ usingPPPs: { memberSchemes: [undefined] } }).memberSchemes).toEqual(['None'])
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

  test('Should map the agricultural sectors to the labels used on the question page', () => {
    expect(
      buildAnswers({ usingPPPs: { agriSubsectors: ['arable', 'grasslands-fodder'] } }).agriSubsectors
    ).toEqual(['Arable', 'Grasslands and fodder crops'])
  })

  test('Should give the Other text as the agricultural sectors when none was chosen', () => {
    expect(buildAnswers({ usingPPPs: { agriSubsectors: ['Hops'] } }).agriSubsectors).toEqual([
      'Hops'
    ])
  })

  test('Should map the amenity sectors to the labels used on the question page', () => {
    expect(
      buildAnswers({ usingPPPs: { amenitySubsectors: ['gardens-lawncare', 'sports-public-amenity'] } })
        .amenitySubsectors
    ).toEqual(['Gardens and Lawncare', 'Sports and Public Amenity land'])
  })

  test('Should map the horticultural sectors to the labels used on the question page', () => {
    expect(
      buildAnswers({ usingPPPs: { hortiSubsectors: ['edible-protected', 'ornamentals'] } })
        .hortiSubsectors
    ).toEqual(['Edible protected crops', 'Ornamental Plants'])
  })

  test('Should leave out the agricultural sectors when they were not given', () => {
    expect(buildAnswers({ usingPPPs: { whoApplies: 'self' } })).not.toHaveProperty('agriSubsectors')
  })

  test('Should leave out the PPP sectors when they were not given', () => {
    expect(buildAnswers({ usingPPPs: { whoApplies: 'self' } })).not.toHaveProperty('professionalSectors')
  })

  test('Should map the member schemes to the labels used on the question page', () => {
    const answers = buildAnswers({
      usingPPPs: { memberSchemes: ['red-tractor', 'sqc'] }
    })

    expect(answers.memberSchemes).toEqual([
      'Red Tractor',
      'Scottish Quality Crops (SQC)'
    ])
  })

  test('Should give an international main address one line per line typed, changed on its own page', () => {
    const answers = buildAnswers({ address: { internationalAddress: 'Rue de la Paix 12\n\n75002 Paris\nFrance' } })

    expect(answers.address).toEqual(['Rue de la Paix 12', '75002 Paris', 'France'])
    expect(answers.addressChangePage).toBe('/business-address/international')
  })

  test('Should leave the address change page to the default for an address in Great Britain', () => {
    expect(buildAnswers({ address: { addressLine1: '1 Barn Lane' } })).not.toHaveProperty('addressChangePage')
  })
})
