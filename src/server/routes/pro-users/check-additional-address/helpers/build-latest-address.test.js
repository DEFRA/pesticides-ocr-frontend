import { buildLatestAddress } from './build-latest-address.js'

describe('#buildLatestAddress', () => {
  test('Should return null when no additional address has been entered', () => {
    expect(buildLatestAddress([])).toBeNull()
    expect(buildLatestAddress()).toBeNull()
  })

  test('Should flatten the address into one line per part, skipping the optional ones', () => {
    const result = buildLatestAddress([
      {
        address: {
          'address-line-1': 'Highfield Farm',
          'address-line-2': '',
          'address-town': 'Farm town',
          'address-county': '',
          'address-postcode': 'PH1 1FT'
        }
      }
    ])

    expect(result.address).toEqual(['Highfield Farm', 'Farm town', 'PH1 1FT'])
  })

  test('Should split the contact details into separate answers', () => {
    const result = buildLatestAddress([
      {
        contact: {
          'contact-name': 'John Smith',
          'contact-telephone': '01234 567890',
          'contact-email': 'john.smith@pesticides.co.uk'
        }
      }
    ])

    expect(result.contactName).toEqual(['John Smith'])
    expect(result.contactTelephone).toEqual(['01234 567890'])
    expect(result.contactEmail).toEqual(['john.smith@pesticides.co.uk'])
  })

  test('Should map activity codes to the labels used on the question page', () => {
    const result = buildLatestAddress([{ activity: ['store', 'records'] }])

    expect(result.activity).toEqual([
      'Store plant protection products (PPPs) or adjuvants',
      'Keep records of plant protection products (PPPs)'
    ])
  })

  test('Should only ever describe the most recently added entry', () => {
    const result = buildLatestAddress([
      { address: { 'address-town': 'Leeds' } },
      { address: { 'address-town': 'Northallerton' } }
    ])

    expect(result.address).toEqual(['Northallerton'])
  })

  test('Should number the entry by how many addresses have been added so far', () => {
    const one = buildLatestAddress([{ address: {} }])
    const two = buildLatestAddress([{ address: {} }, { address: {} }])

    expect(one.number).toBe(1)
    expect(two.number).toBe(2)
  })

  test('Should give every unanswered field an empty list', () => {
    expect(buildLatestAddress([{}])).toEqual({
      number: 1,
      address: [],
      contactName: [],
      contactEmail: [],
      contactTelephone: [],
      activity: []
    })
  })
})
