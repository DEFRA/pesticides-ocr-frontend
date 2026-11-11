import { findAddresses } from './address-lookup.js'

describe('#findAddresses', () => {
  test.each([
    [{ postcode: 'AA3 1AB' }],
    [{ postcode: 'aa31ab', building: 'Lower Meadow Barn' }],
    [{}],
    [undefined]
  ])('Should find no addresses for %o, as no lookup service is connected', async (search) => {
    expect(await findAddresses(search)).toEqual([])
  })
})
