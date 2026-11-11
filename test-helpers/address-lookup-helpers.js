import { formatPostcode } from '#/server/common/helpers/postcode.js'

// Made-up addresses for tests of the address select pages. The real
// findAddresses finds nothing, so these tests swap it for findTestAddresses:
//
//   vi.mock('#/server/common/helpers/address-lookup.js', async () => {
//     const { findTestAddresses } = await import('#/test-helpers/address-lookup-helpers.js')
//
//     return { findAddresses: vi.fn(findTestAddresses) }
//   })
const TEST_ADDRESSES = [
  {
    addressLine1: 'Lower Meadow Barn',
    addressLine2: 'Mill Lane',
    addressTown: 'Farm town',
    addressCounty: 'Farmshire',
    addressRegion: 'england'
  },
  {
    addressLine1: 'Highfield Farm',
    addressLine2: 'Mill Lane',
    addressTown: 'Farm town',
    addressCounty: 'Farmshire',
    addressRegion: 'england'
  },
  { addressLine1: '1 Mill Lane', addressTown: 'Farm town', addressRegion: 'england' },
  { addressLine1: '2 Mill Lane', addressTown: 'Farm town', addressRegion: 'england' }
]

const matchesBuilding = (building) => (address) =>
  !building || address.addressLine1.toLowerCase().includes(building.trim().toLowerCase())

// Finds the same four addresses at any postcode, narrowed down by building.
export async function findTestAddresses({ postcode, building } = {}) {
  if (!postcode) {
    return []
  }

  return TEST_ADDRESSES.filter(matchesBuilding(building)).map((address) => ({
    ...address,
    addressPostcode: formatPostcode(postcode)
  }))
}
