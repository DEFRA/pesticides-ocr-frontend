import { formatPostcode } from './postcode.js'

// STUB: there is no address lookup service yet (OS Places or similar). Replace
// this module with a real lookup, keeping the interface:
//
//   findAddresses({ postcode, building }) -> Promise<Array<{
//     addressLine1, addressLine2?, addressTown, addressCounty?, addressPostcode,
//     addressRegion
//   }>>
//
// `addressRegion` is where in Great Britain the address is: 'england',
// 'scotland' or 'wales' (the values in regions.js). The view calls it the
// country.
//
// The results must come back in the same order for the same search, because
// the select page identifies the chosen address by its position in the list.
//
// Until then, every postcode "finds" the same made-up addresses, and a building
// name or number narrows them down. A building that matches none of them (for
// example "Nowhere") shows the no-results page.
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
