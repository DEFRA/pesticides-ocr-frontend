// Searches by postcode and building name or number (see business-address).
export const ADDRESS_SEARCH_PAGE = '/business-address'

// Shows the addresses found for the search and saves the chosen one as
// `address` (see business-address/select). No lookup service is connected
// yet, so it never finds any and offers manual entry instead.
export const ADDRESS_SELECT_PAGE = '/business-address/select'

// Lets someone type the address in instead of using the lookup (see business-address/manual).
export const ADDRESS_MANUAL_PAGE = '/business-address/manual'

// For a main business address outside Great Britain, typed into one box and
// saved as `address.internationalAddress` (see business-address/international).
export const INTERNATIONAL_ADDRESS_PAGE = '/business-address/international'
