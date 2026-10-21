import { ADDRESS_SEARCH_PAGE } from '#/server/common/constants/address-pages.js'
import { SELLING } from '#/server/routes/qualifying-questions/business-activities/items.js'
import { USING_PPPS_KEY, getUsingPPPsAnswers } from './using-ppps-answers.js'

const FIRST_PAGE = '/business-activities'
export const CHECK_ANSWERS_PAGE = '/check-answers'

// The sell section isn't built yet, so this route doesn't exist and the
// journey stops here for anyone who only sells PPPs.
export const SELL_SECTION_PAGE = '/sell'

// Where an organisation that uses PPPs says who applies them, after the business
// contact (see routes/using-ppps/who-applies). Every using PPPs page sits under
// /using-ppps, and their answers under formSession.usingPPPs.
export const WHO_APPLIES_PAGE = '/using-ppps/who-applies'

// Where an organisation that uses PPPs says which sectors its PPP activities
// are in, after who applies them (and the contractor's details, if any). See
// routes/using-ppps/ppp-sectors.
export const PPP_SECTORS_PAGE = '/using-ppps/ppp-sectors'

// Where an organisation that uses a contractor gives the contractor's name and
// address (see routes/using-ppps/contractor-address).
export const CONTRACTOR_ADDRESS_PAGE = '/using-ppps/contractor-address'

// Each sector with sub-sectors (agriculture, amenity, horticulture) has its own
// page after the PPP sectors, asked in that order for the sectors ticked.
// See routes/using-ppps/agri-subsectors, amenity-subsector and horti-subsector.
export const AGRI_SUBSECTORS_PAGE = '/using-ppps/agri-subsectors'
export const AMENITY_SUBSECTOR_PAGE = '/using-ppps/amenity-subsector'
export const HORTI_SUBSECTOR_PAGE = '/using-ppps/horti-subsector'

// The using PPPs member schemes page isn't built yet, so this route doesn't
// exist and the journey stops here after the last sub-sector page.
export const USING_MEMBER_SCHEMES_PAGE = '/using-ppps/member-schemes'

// Where an organisation that uses PPPs says whether it stores the products it
// applies, after the PPP sectors (see routes/using-ppps/storing).
export const STORING_PAGE = '/using-ppps/storing'

// Where an organisation that stores the products it applies at sites it owns
// says where those sites are (see routes/using-ppps/storage-location).
export const STORAGE_LOCATION_PAGE = '/using-ppps/storage-location'

// Where an organisation that stores products at other locations too finds the
// address of that location, with a lookup like the business address's (see
// routes/using-ppps/own-storage-address).
export const OWN_STORAGE_ADDRESS_PAGE = '/using-ppps/own-storage-address'
export const OWN_STORAGE_ADDRESS_SELECT_PAGE = '/using-ppps/own-storage-address/select'
export const OWN_STORAGE_ADDRESS_MANUAL_PAGE = '/using-ppps/own-storage-address/manual'

// The third-party storage page isn't built yet, so this route doesn't exist and
// the journey stops here for anyone it applies to.
export const STORAGE_PROVIDER_PAGE = '/using-ppps/storage-provider'

// Where an organisation that uses PPPs gives the quantity it uses in a typical
// year (see routes/using-ppps/quantity).
export const USING_QUANTITY_PAGE = '/using-ppps/quantity'

const onlySellsProducts = ({ businessActivities = [] }) =>
  businessActivities.length === 1 && businessActivities[0] === SELLING

const usesProducts = ({ businessActivities = [] }) => businessActivities.includes('using')

// professionalSectors holds the chosen sector values, or just the Other text.
function worksIn(sector) {
  return (formSession) =>
    (getUsingPPPsAnswers(formSession)['professionalSectors'] ?? []).includes(sector)
}

const worksInAgriculture = worksIn('agriculture')
const worksInAmenity = worksIn('amenity')
const worksInHorticulture = worksIn('horticulture')

// After the agricultural sectors, the next ticked sector's page, if any.
function pageAfterAgriSubsectors(formSession) {
  if (worksInAmenity(formSession)) {
    return AMENITY_SUBSECTOR_PAGE
  }

  if (worksInHorticulture(formSession)) {
    return HORTI_SUBSECTOR_PAGE
  }

  return USING_MEMBER_SCHEMES_PAGE
}

// After the amenity sectors, the horticultural sectors if ticked.
function pageAfterAmenitySubsectors(formSession) {
  return worksInHorticulture(formSession) ? HORTI_SUBSECTOR_PAGE : USING_MEMBER_SCHEMES_PAGE
}

function pageAfterWhoApplies(formSession) {
  return getUsingPPPsAnswers(formSession)['whoApplies'] === 'contractor'
    ? CONTRACTOR_ADDRESS_PAGE
    : PPP_SECTORS_PAGE
}

// The first matching sector, in this order, decides the next page.
function pageAfterSectors(formSession) {
  if (worksInAgriculture(formSession)) {
    return AGRI_SUBSECTORS_PAGE
  }

  if (worksInAmenity(formSession)) {
    return AMENITY_SUBSECTOR_PAGE
  }

  if (worksInHorticulture(formSession)) {
    return HORTI_SUBSECTOR_PAGE
  }

  return STORING_PAGE
}

function pageAfterStorageLocation(formSession) {
  return getUsingPPPsAnswers(formSession)['storageLocation'] === 'main-address'
    ? USING_QUANTITY_PAGE
    : OWN_STORAGE_ADDRESS_PAGE
}

function pageAfterStoring(formSession) {
  const { storing } = getUsingPPPsAnswers(formSession)

  if (storing === 'own') {
    return STORAGE_LOCATION_PAGE
  }

  if (storing === 'third-party') {
    return STORAGE_PROVIDER_PAGE
  }

  return USING_QUANTITY_PAGE
}

export const JOURNEY = {
  '/business-activities': {
    sessionKey: 'businessActivities',
    next: () => '/business-name'
  },
  '/business-name': {
    sessionKey: 'businessName',
    next: (formSession) =>
      onlySellsProducts(formSession) ? SELL_SECTION_PAGE : ADDRESS_SEARCH_PAGE
  },
  [ADDRESS_SEARCH_PAGE]: {
    sessionKey: 'address',
    next: () => '/business-contact'
  },
  '/business-contact': {
    sessionKey: 'primaryContact',
    next: (formSession) => (usesProducts(formSession) ? WHO_APPLIES_PAGE : '/address-activity')
  },
  // A page with a `section` keeps its answer under formSession[section] rather
  // than at the top level.
  [WHO_APPLIES_PAGE]: {
    section: USING_PPPS_KEY,
    sessionKey: 'whoApplies',
    next: pageAfterWhoApplies
  },
  [CONTRACTOR_ADDRESS_PAGE]: {
    section: USING_PPPS_KEY,
    sessionKey: 'contractor',
    next: () => PPP_SECTORS_PAGE
  },
  [PPP_SECTORS_PAGE]: {
    section: USING_PPPS_KEY,
    sessionKey: 'professionalSectors',
    next: pageAfterSectors
  },
  [AGRI_SUBSECTORS_PAGE]: {
    section: USING_PPPS_KEY,
    sessionKey: 'agriSubsectors',
    next: pageAfterAgriSubsectors
  },
  [AMENITY_SUBSECTOR_PAGE]: {
    section: USING_PPPS_KEY,
    sessionKey: 'amenitySubsectors',
    next: pageAfterAmenitySubsectors
  },
  [HORTI_SUBSECTOR_PAGE]: {
    section: USING_PPPS_KEY,
    sessionKey: 'hortiSubsectors',
    next: () => STORING_PAGE
  },
  [STORING_PAGE]: {
    section: USING_PPPS_KEY,
    sessionKey: 'storing',
    next: pageAfterStoring
  },
  [STORAGE_LOCATION_PAGE]: {
    section: USING_PPPS_KEY,
    sessionKey: 'storageLocation',
    next: pageAfterStorageLocation
  },
  [OWN_STORAGE_ADDRESS_PAGE]: {
    section: USING_PPPS_KEY,
    sessionKey: 'ownStorageAddress',
    next: () => USING_QUANTITY_PAGE
  },
  [USING_QUANTITY_PAGE]: {
    section: USING_PPPS_KEY,
    sessionKey: 'quantity',
    next: () => CHECK_ANSWERS_PAGE
  },
  '/address-activity': {
    sessionKey: 'addressActivities',
    next: (formSession) =>
      formSession['addressActivities'].includes('use') ? '/member-schemes' : CHECK_ANSWERS_PAGE
  },
  '/member-schemes': {
    sessionKey: 'memberSchemes',
    next: () => '/additional-addresses'
  },
  '/additional-addresses': {
    sessionKey: 'additionalAddresses',
    optional: true,
    next: () => CHECK_ANSWERS_PAGE
  }
}

const JOURNEY_PAGES = Object.keys(JOURNEY)

const answersFor = (page, formSession) => {
  const { section } = JOURNEY[page]

  return section ? (formSession[section] ?? {}) : formSession
}

const isAnswered = (page, formSession) =>
  page in JOURNEY &&
  (JOURNEY[page].optional || answersFor(page, formSession)[JOURNEY[page].sessionKey] !== undefined)

export function getNextPage(page, formSession) {
  return JOURNEY[page].next(formSession)
}

function followRoute(formSession) {
  const answeredPages = []
  let page = FIRST_PAGE

  while (page !== CHECK_ANSWERS_PAGE && isAnswered(page, formSession)) {
    answeredPages.push(page)
    page = getNextPage(page, formSession)
  }

  return { answeredPages, stoppedAt: page }
}

export function findFirstMissingPage(formSession) {
  return followRoute(formSession).stoppedAt
}

export function getPreviousPage(page, formSession) {
  const { answeredPages, stoppedAt } = followRoute(formSession)
  const route = [...answeredPages, stoppedAt]
  const position = route.indexOf(page)

  return position > 0 ? route[position - 1] : undefined
}

export function isOnRoute(page, formSession) {
  return followRoute(formSession).answeredPages.includes(page)
}

// A route that leaves the journey map (e.g. into the sell section) gives no
// view of the pages after it, so only pages up to the last answered one count.
function routeEnd(answeredPages, stoppedAt) {
  if (stoppedAt === CHECK_ANSWERS_PAGE) {
    return JOURNEY_PAGES.length
  }

  return stoppedAt in JOURNEY
    ? JOURNEY_PAGES.indexOf(stoppedAt)
    : JOURNEY_PAGES.indexOf(answeredPages.at(-1)) + 1
}

const withoutKeys = (answers, keys) =>
  Object.fromEntries(Object.entries(answers).filter(([key]) => !keys.has(key)))

const keysIn = (pages, section) =>
  new Set(pages.filter((page) => JOURNEY[page].section === section).map((page) => JOURNEY[page].sessionKey))

// Removes a section's skipped answers, and the section itself once it's empty.
function withoutSectionKeys(formSession, section, keys) {
  if (!formSession[section]) {
    return formSession
  }

  const remaining = withoutKeys(formSession[section], keys)

  return Object.keys(remaining).length
    ? { ...formSession, [section]: remaining }
    : withoutKeys(formSession, new Set([section]))
}

export function removeSkippedAnswers(formSession) {
  const { answeredPages, stoppedAt } = followRoute(formSession)
  const knownRouteEnd = routeEnd(answeredPages, stoppedAt)

  const skippedPages = JOURNEY_PAGES.slice(0, knownRouteEnd).filter(
    (page) => !answeredPages.includes(page)
  )
  const sections = new Set(skippedPages.map((page) => JOURNEY[page].section).filter(Boolean))

  return [...sections].reduce(
    (answers, section) => withoutSectionKeys(answers, section, keysIn(skippedPages, section)),
    withoutKeys(formSession, keysIn(skippedPages, undefined))
  )
}
