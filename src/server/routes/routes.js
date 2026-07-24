import { home } from './home/index.js'
import { businessActivities } from './qualifying-questions/1-business-activities/business-activities.js'
import { mainCustomer } from './qualifying-questions/2-main-customer/main-customer.js'
import { businessName } from './qualifying-questions/3-business-name/business-name.js'
import { businessAddress } from './qualifying-questions/4-business-address/business-address.js'
import { businessContact } from './qualifying-questions/5-business-contact/business-contact.js'

export const routes = [
  home,
  businessActivities,
  mainCustomer,
  businessName,
  businessAddress,
  businessContact
]

export default routes
