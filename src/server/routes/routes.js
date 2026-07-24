import { home } from './home/index.js'
import { businessActivities } from './qualifying-questions/1-business-activities/business-activities.js'
import { mainCustomer } from './qualifying-questions/2-main-customer/main-customer.js'
import { businessName } from './qualifying-questions/3-business-name/business-name.js'
import { businessAddress } from './qualifying-questions/4-business-address/business-address.js'
import { businessContact } from './qualifying-questions/5-business-contact/business-contact.js'
import { addressActivity } from './qualifying-questions/6-address-activity/address-activity.js'
import { quantity } from './qualifying-questions/7-quantity/quantity.js'
import { checkAnswers } from './qualifying-questions/8-check-answers/check-answers.js'
import { confirmation } from './qualifying-questions/9-confirmation/confirmation.js'

export const routes = [
  home,
  businessActivities,
  mainCustomer,
  businessName,
  businessAddress,
  businessContact,
  addressActivity,
  quantity,
  checkAnswers,
  confirmation
]

export default routes
