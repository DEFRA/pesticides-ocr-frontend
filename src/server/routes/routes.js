import { home } from './home/index.js'
import { businessActivities } from './qualifying-questions/1-business-activities/business-activities.js'
import { mainCustomer } from './qualifying-questions/2-main-customer/main-customer.js'
import { businessName } from './qualifying-questions/3-business-name/business-name.js'
import { businessAddress } from './qualifying-questions/4-business-address/business-address.js'

export const routes = [
  home,
  businessActivities,
  mainCustomer,
  businessName,
  businessAddress
]

export default routes
