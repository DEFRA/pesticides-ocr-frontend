// The postcode and building searched for. It's only needed to run the lookup,
// so it's kept out of `formSession`, which is sent to the backend as the answers.
export const ADDRESS_SEARCH_KEY = 'addressSearch'

// The same, for the own storage address.
export const OWN_STORAGE_ADDRESS_SEARCH_KEY = 'ownStorageAddressSearch'

// The sections of `formSession` that hold the using, processing and distribute PPPs answers.
export const USING_PPPS_KEY = 'usingPPPs'
export const PROCESSING_PPPS_KEY = 'processingPPPs'
export const DISTRIBUTE_PPPS_KEY = 'distributePPPs'
