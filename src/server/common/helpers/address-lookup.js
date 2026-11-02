import { formatPostcode } from './postcode.js'

// STUB: replace with a real address lookup (OS Places or similar), keeping the interface:
//
//   findAddresses({ postcode, building }) -> Promise<Array<{
//     addressLine1, addressLine2?, addressTown, addressCounty?, addressPostcode,
//     addressRegion
//   }>>
//
// Results must come back in the same order for the same search, because the select page uses positions.
const STUB_ADDRESSES = [
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

export async function findAddresses({ postcode, building } = {}) {
  if (!postcode) {
    return []
  }

  return STUB_ADDRESSES.filter(matchesBuilding(building)).map((address) => ({
    ...address,
    addressPostcode: formatPostcode(postcode)
  }))
}
