// Searches by postcode and building name or number (see business-address).
export const ADDRESS_SEARCH_PAGE = '/business-address'

// Shows the addresses found for the search and saves the chosen one as
// `address` (see business-address/select). The lookup behind it is still a stub.
export const ADDRESS_SELECT_PAGE = '/business-address/select'

// Lets someone type the address in instead of using the lookup (see business-address/manual).
export const ADDRESS_MANUAL_PAGE = '/business-address/manual'

// The page for an address outside Great Britain isn't built yet, so this
// route doesn't exist and the link 404s, like the sell section.
export const INTERNATIONAL_ADDRESS_PAGE = '/business-address/international'
