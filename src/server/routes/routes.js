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
import { checkAnswers } from './amateur-sellers/check-answers/check-answers.js'
import { confirmation } from './amateur-sellers/confirmation/confirmation.js'
import { notEligible } from './qualifying-questions/not-eligible/not-eligible.js'

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
  notEligible
]

export default routes
