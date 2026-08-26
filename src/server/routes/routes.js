import { home } from './home/index.js'
import { dashboard } from './dashboard/index.js'
import { adminOperators } from './admin/operators/index.js'
import { businessActivities } from './qualifying-questions/business-activities/business-activities.js'
import { mainCustomer } from './qualifying-questions/main-customer/main-customer.js'
import { businessName } from './qualifying-questions/business-name/business-name.js'
import { businessAddress } from './qualifying-questions/business-address/business-address.js'
import { businessContact } from './qualifying-questions/business-contact/business-contact.js'
import { addressActivity } from './qualifying-questions/address-activity/address-activity.js'
import { quantity } from './qualifying-questions/quantity/quantity.js'
import { checkAnswers } from './check-confirm/check-answers/check-answers.js'
import { confirmation } from './check-confirm/confirmation/confirmation.js'
import { notEligible } from './qualifying-questions/not-eligible/not-eligible.js'
import { professionalSectors } from './pro-users/professional-sectors/professional-sectors.js'
import { memberSchemes } from './pro-users/member-schemes/member-schemes.js'
import { additionalAddresses } from './pro-users/additional-addresses/additional-addresses.js'
import { additionalBusinessAddress } from './pro-users/additional-business-address/additional-business-address.js'
import { additionalBusinessContact } from './pro-users/additional-business-contact/additional-business-contact.js'
import { additionalBusinessActivity } from './pro-users/additional-business-activity/additional-business-activity.js'
import { checkAdditionalAddress } from './pro-users/check-additional-address/check-additional-address.js'

export const routes = [
  home,
  dashboard,
  adminOperators,
  businessActivities,
  mainCustomer,
  businessName,
  businessAddress,
  businessContact,
  addressActivity,
  quantity,
  checkAnswers,
  confirmation,
  notEligible,
  professionalSectors,
  memberSchemes,
  additionalAddresses,
  additionalBusinessAddress,
  additionalBusinessContact,
  additionalBusinessActivity,
  checkAdditionalAddress
]

export default routes
