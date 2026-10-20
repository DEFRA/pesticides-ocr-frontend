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
import { storing } from './using-ppps/storing/index.js'
import { usingQuantity } from './using-ppps/quantity/index.js'
import { addressActivity } from './qualifying-questions/address-activity/index.js'
import { checkAnswers } from './check-confirm/check-answers/index.js'
import { confirmation } from './check-confirm/confirmation/index.js'
import { notEligible } from './qualifying-questions/not-eligible/index.js'
import { memberSchemes } from './pro-users/member-schemes/index.js'
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
  storing,
  usingQuantity,
  addressActivity,
  checkAnswers,
  confirmation,
  notEligible,
  memberSchemes,
  additionalAddresses,
  additionalBusinessAddress,
  additionalBusinessContact,
  additionalBusinessActivity,
  checkAdditionalAddress
]

export default routes
