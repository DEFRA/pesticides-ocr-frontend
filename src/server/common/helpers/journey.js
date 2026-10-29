import { ADDRESS_SEARCH_PAGE } from '#/server/common/constants/address-pages.js'
import {
  DISTRIBUTE_PPPS_KEY,
  PROCESSING_PPPS_KEY,
  STORE_PPPS_KEY,
  USING_PPPS_KEY
} from '#/server/common/constants/session-keys.js'
import {
  DISTRIBUTING,
  ONLY_STORING,
  PROCESSING,
  SELLING,
  USING
} from '#/server/routes/qualifying-questions/business-activities/items.js'
import { getUsingPPPsAnswers } from './using-ppps-answers.js'

const FIRST_PAGE = '/business-activities'
export const CHECK_ANSWERS_PAGE = '/check-answers'

// The sell section isn't built yet, so this route doesn't exist and the
// journey stops here for anyone who only sells PPPs.
export const SELL_SECTION_PAGE = '/sell'

// Every using PPPs page sits under /using-ppps, and its answer under
// formSession.usingPPPs.
export const WHO_APPLIES_PAGE = '/using-ppps/who-applies'
export const CONTRACTOR_ADDRESS_PAGE = '/using-ppps/contractor-address'
export const PPP_SECTORS_PAGE = '/using-ppps/ppp-sectors'

// Each sector with sub-sectors (agriculture, amenity, horticulture) has its own
// page after the PPP sectors, asked in that order for the sectors ticked.
export const AGRI_SUBSECTORS_PAGE = '/using-ppps/agri-subsectors'
export const AMENITY_SUBSECTORS_PAGE = '/using-ppps/amenity-subsectors'
export const HORTI_SUBSECTORS_PAGE = '/using-ppps/horti-subsectors'

export const USING_MEMBER_SCHEMES_PAGE = '/using-ppps/member-schemes'
export const STORING_PAGE = '/using-ppps/storing'
export const STORAGE_LOCATION_PAGE = '/using-ppps/storage-location'
export const OWN_STORAGE_ADDRESS_PAGE = '/using-ppps/own-storage-address'
export const OWN_STORAGE_ADDRESS_SELECT_PAGE = '/using-ppps/own-storage-address/select'
export const OWN_STORAGE_ADDRESS_MANUAL_PAGE = '/using-ppps/own-storage-address/manual'
export const STORAGE_CONTACT_PAGE = '/using-ppps/third-party-storage-contact'
export const USING_QUANTITY_PAGE = '/using-ppps/quantity'

// Every processing PPPs page sits under /processing-ppps, and its answer under
// formSession.processingPPPs.
export const PROCESSING_PRODUCTS_PAGE = '/processing-ppps/products'
export const PROCESSING_SITES_PAGE = '/processing-ppps/sites'
export const PROCESSING_QUANTITY_PAGE = '/processing-ppps/quantity'

// The distribute pages, for an organisation that distributes PPPs, after any
// earlier activity sections it needs (see ACTIVITY_SECTIONS). Their answers are
// under formSession.distributePPPs (see routes/distribute).
export const DISTRIBUTE_PRODUCTS_PAGE = '/distribute/products'
export const DISTRIBUTE_SITES_PAGE = '/distribute/sites'
export const DISTRIBUTE_QUANTITY_PAGE = '/distribute/quantity'

// The storing pages, for an organisation that only stores PPPs for other
// businesses. Their answers are under formSession.storePPPs (see routes/storing).
export const STORE_PRODUCTS_PAGE = '/storing/products'
export const STORE_SITES_PAGE = '/storing/sites'
export const STORE_QUANTITY_PAGE = '/storing/quantity'

const onlySellsProducts = ({ businessActivities = [] }) =>
  businessActivities.length === 1 && businessActivities[0] === SELLING

// The activity sections, in the order the journey asks them: each is shown when
// its business activity is ticked, after the earlier ones. The Manufacture,
// Import and Sell sections will slot in here (Using, Manufacture, Import,
// Process, Sell, Distribute) once they're built.
const ACTIVITY_SECTIONS = [
  { activity: USING, firstPage: WHO_APPLIES_PAGE },
  { activity: PROCESSING, firstPage: PROCESSING_PRODUCTS_PAGE },
  { activity: DISTRIBUTING, firstPage: DISTRIBUTE_PRODUCTS_PAGE },
  // "Only storing" can't be ticked with any other activity, so its place in
  // the order doesn't matter.
  { activity: ONLY_STORING, firstPage: STORE_PRODUCTS_PAGE }
]

// The first page of the next ticked section after `afterActivity`'s (or of the
// first ticked section, with no `afterActivity`), if there is one.
function nextSectionPage({ businessActivities = [] }, afterActivity) {
  const start = afterActivity
    ? ACTIVITY_SECTIONS.findIndex(({ activity }) => activity === afterActivity) + 1
    : 0

  return ACTIVITY_SECTIONS.slice(start).find(({ activity }) => businessActivities.includes(activity))
    ?.firstPage
}

const pageAfterBusinessContact = (formSession) =>
  nextSectionPage(formSession) ?? '/address-activity'

// The end of a section: on to the next ticked section, or check answers.
const pageAfterSection = (activity) => (formSession) =>
  nextSectionPage(formSession, activity) ?? CHECK_ANSWERS_PAGE

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
    return AMENITY_SUBSECTORS_PAGE
  }

  if (worksInHorticulture(formSession)) {
    return HORTI_SUBSECTORS_PAGE
  }

  return USING_MEMBER_SCHEMES_PAGE
}

// After the amenity sectors, the horticultural sectors if ticked. Otherwise the
// assurance schemes, which aren't asked of amenity-only organisations.
function pageAfterAmenitySubsectors(formSession) {
  if (worksInHorticulture(formSession)) {
    return HORTI_SUBSECTORS_PAGE
  }

  return worksInAgriculture(formSession) ? USING_MEMBER_SCHEMES_PAGE : STORING_PAGE
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
    return AMENITY_SUBSECTORS_PAGE
  }

  if (worksInHorticulture(formSession)) {
    return HORTI_SUBSECTORS_PAGE
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
    return STORAGE_CONTACT_PAGE
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
    next: pageAfterBusinessContact
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
  [AMENITY_SUBSECTORS_PAGE]: {
    section: USING_PPPS_KEY,
    sessionKey: 'amenitySubsectors',
    next: pageAfterAmenitySubsectors
  },
  [HORTI_SUBSECTORS_PAGE]: {
    section: USING_PPPS_KEY,
    sessionKey: 'hortiSubsectors',
    next: () => USING_MEMBER_SCHEMES_PAGE
  },
  [USING_MEMBER_SCHEMES_PAGE]: {
    section: USING_PPPS_KEY,
    sessionKey: 'memberSchemes',
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
  [STORAGE_CONTACT_PAGE]: {
    section: USING_PPPS_KEY,
    sessionKey: 'storageContact',
    next: () => USING_QUANTITY_PAGE
  },
  [USING_QUANTITY_PAGE]: {
    section: USING_PPPS_KEY,
    sessionKey: 'quantity',
    next: pageAfterSection(USING)
  },
  [PROCESSING_PRODUCTS_PAGE]: {
    section: PROCESSING_PPPS_KEY,
    sessionKey: 'products',
    next: () => PROCESSING_SITES_PAGE
  },
  [PROCESSING_SITES_PAGE]: {
    section: PROCESSING_PPPS_KEY,
    sessionKey: 'sites',
    next: () => PROCESSING_QUANTITY_PAGE
  },
  [PROCESSING_QUANTITY_PAGE]: {
    section: PROCESSING_PPPS_KEY,
    sessionKey: 'quantity',
    next: pageAfterSection(PROCESSING)
  },
  [DISTRIBUTE_PRODUCTS_PAGE]: {
    section: DISTRIBUTE_PPPS_KEY,
    sessionKey: 'products',
    next: () => DISTRIBUTE_SITES_PAGE
  },
  [DISTRIBUTE_SITES_PAGE]: {
    section: DISTRIBUTE_PPPS_KEY,
    sessionKey: 'sites',
    next: () => DISTRIBUTE_QUANTITY_PAGE
  },
  // Where the journey goes after the distribute pages isn't defined yet.
  [DISTRIBUTE_QUANTITY_PAGE]: {
    section: DISTRIBUTE_PPPS_KEY,
    sessionKey: 'quantity',
    next: () => CHECK_ANSWERS_PAGE
  },
  [STORE_PRODUCTS_PAGE]: {
    section: STORE_PPPS_KEY,
    sessionKey: 'products',
    next: () => STORE_SITES_PAGE
  },
  [STORE_SITES_PAGE]: {
    section: STORE_PPPS_KEY,
    sessionKey: 'sites',
    next: () => STORE_QUANTITY_PAGE
  },
  [STORE_QUANTITY_PAGE]: {
    section: STORE_PPPS_KEY,
    sessionKey: 'quantity',
    next: () => CHECK_ANSWERS_PAGE
  },
  '/address-activity': {
    sessionKey: 'addressActivities',
    next: (formSession) =>
      formSession['addressActivities'].includes('use') ? '/additional-addresses' : CHECK_ANSWERS_PAGE
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
