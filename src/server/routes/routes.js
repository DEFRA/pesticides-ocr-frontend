import { home } from './home/index.js'
import { cookies } from './cookies/index.js'
import { dashboard } from './dashboard/index.js'
import { search } from './search/index.js'
import { serviceMetrics } from './service-metrics/index.js'
import { businessActivities } from './qualifying-questions/business-activities/index.js'
import { businessName } from './qualifying-questions/business-name/index.js'
import { businessAddress } from './qualifying-questions/business-address/index.js'
import { businessAddressSelect } from './qualifying-questions/business-address/select/index.js'
import { businessAddressManual } from './qualifying-questions/business-address/manual/index.js'
import { businessContact } from './qualifying-questions/business-contact/index.js'
import { whoApplies } from './using-ppps/who-applies/index.js'
import { contractorAddress } from './using-ppps/contractor-address/index.js'
import { pppSectors } from './using-ppps/ppp-sectors/index.js'
import { agriSubsectors } from './using-ppps/agri-subsectors/index.js'
import { amenitySubsectors } from './using-ppps/amenity-subsectors/index.js'
import { hortiSubsectors } from './using-ppps/horti-subsectors/index.js'
import { memberSchemes } from './using-ppps/member-schemes/index.js'
import { storing } from './using-ppps/storing/index.js'
import { storageLocation } from './using-ppps/storage-location/index.js'
import { ownStorageAddress } from './using-ppps/own-storage-address/index.js'
import { ownStorageAddressSelect } from './using-ppps/own-storage-address/select/index.js'
import { ownStorageAddressManual } from './using-ppps/own-storage-address/manual/index.js'
import { storageContact } from './using-ppps/third-party-storage-contact/index.js'
import { usingQuantity } from './using-ppps/quantity/index.js'
import { processingProducts } from './processing-ppps/products/index.js'
import { processingSites } from './processing-ppps/sites/index.js'
import { processingQuantity } from './processing-ppps/quantity/index.js'
import { distributeProducts } from './distribute/products/index.js'
import { distributeSites } from './distribute/sites/index.js'
import { distributeQuantity } from './distribute/quantity/index.js'
import { addressActivity } from './qualifying-questions/address-activity/index.js'
import { checkAnswers } from './check-confirm/check-answers/index.js'
import { confirmation } from './check-confirm/confirmation/index.js'
import { notEligible } from './qualifying-questions/not-eligible/index.js'
import { additionalAddresses } from './pro-users/additional-addresses/index.js'
import { additionalBusinessAddress } from './pro-users/additional-business-address/index.js'
import { additionalBusinessContact } from './pro-users/additional-business-contact/index.js'
import { additionalBusinessActivity } from './pro-users/additional-business-activity/index.js'
import { checkAdditionalAddress } from './pro-users/check-additional-address/index.js'

export const routes = [
  home,
  cookies,
  dashboard,
  search,
  serviceMetrics,
  businessActivities,
  businessName,
  businessAddress,
  businessAddressSelect,
  businessAddressManual,
  businessContact,
  whoApplies,
  contractorAddress,
  pppSectors,
  agriSubsectors,
  amenitySubsectors,
  hortiSubsectors,
  memberSchemes,
  storing,
  storageLocation,
  ownStorageAddress,
  ownStorageAddressSelect,
  ownStorageAddressManual,
  storageContact,
  usingQuantity,
  processingProducts,
  processingSites,
  processingQuantity,
  distributeProducts,
  distributeSites,
  distributeQuantity,
  addressActivity,
  checkAnswers,
  confirmation,
  notEligible,
  additionalAddresses,
  additionalBusinessAddress,
  additionalBusinessContact,
  additionalBusinessActivity,
  checkAdditionalAddress
]

export default routes
