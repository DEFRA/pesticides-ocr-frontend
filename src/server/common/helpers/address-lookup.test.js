import { findAddresses } from './address-lookup.js'

describe('#findAddresses (stub)', () => {
  test('Should find addresses at the postcode searched for', async () => {
    const addresses = await findAddresses({ postcode: 'aa31ab' })

    expect(addresses.length).toBeGreaterThan(1)
    addresses.forEach((address) => {
      expect(address.addressLine1).toEqual(expect.any(String))
      expect(address.addressTown).toEqual(expect.any(String))
      expect(address.addressPostcode).toBe('AA3 1AB')
    })
  })

  test('Should narrow the addresses down to the building', async () => {
    const addresses = await findAddresses({ postcode: 'AA3 1AB', building: ' lower meadow ' })

    expect(addresses.map((address) => address.addressLine1)).toEqual(['Lower Meadow Barn'])
  })

  test('Should ignore an empty building', async () => {
    const all = await findAddresses({ postcode: 'AA3 1AB' })

    expect(await findAddresses({ postcode: 'AA3 1AB', building: '' })).toEqual(all)
  })

  test('Should find nothing when no address matches the building', async () => {
    expect(await findAddresses({ postcode: 'AA3 1AB', building: 'Nowhere' })).toEqual([])
  })

  test('Should find nothing without a postcode', async () => {
    expect(await findAddresses()).toEqual([])
  })

  test('Should return the addresses in the same order every time', async () => {
    const search = { postcode: 'AA3 1AB' }

    expect(await findAddresses(search)).toEqual(await findAddresses(search))
  })
})
