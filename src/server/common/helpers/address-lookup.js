// No address lookup service (OS Places or similar) is connected yet, so no
// addresses are ever found and the select page offers manual entry instead.
// Users must never be offered made-up addresses.
//
// A real lookup should keep this interface:
//
//   findAddresses({ postcode, building }) -> Promise<Array<{
//     addressLine1, addressLine2?, addressTown, addressCounty?, addressPostcode,
//     addressRegion
//   }>>
//
// Results must come back in the same order for the same search, because the select page uses positions.
export async function findAddresses() {
  return []
}
