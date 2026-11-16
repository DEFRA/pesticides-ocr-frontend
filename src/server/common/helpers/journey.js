import { ADDRESS_SEARCH_PAGE } from '#/server/common/constants/address-pages.js'
import { USING_PPPS_KEY } from '#/server/common/constants/session-keys.js'
import { USING } from '#/server/routes/qualifying-questions/business-activities/items.js'
import { STORES_OWN, STORES_THIRD_PARTY } from '#/server/routes/using-ppps/storing/items.js'
import { getUsingPPPsAnswers } from './using-ppps-answers.js'

// The /start page (register or update) comes before this, but its choice isn't
// an answer, so it's kept out of formSession and out of the map.
const FIRST_PAGE = '/business-contact'
export const CHECK_ANSWERS_PAGE = '/check-answers'

// Check your email, after the business contact. It isn't an answer, so it sits
// outside the map: business contact always redirects to it, and business name's
// back link points to it.
export const VERIFY_EMAIL_PAGE = '/verify-email'

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

// Only using PPPs has pages of its own. The other activities ask nothing
// more, so without it it's on to check answers.
const pageAfterBusinessActivities = ({ businessActivities = [] }) =>
  businessActivities.includes(USING) ? WHO_APPLIES_PAGE : CHECK_ANSWERS_PAGE

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

// storing holds the ticked options. Each one ticked has its own pages, asked in
// this order: own sites, then the third party. "We do not store PPPs" has none.
function stores(option) {
  return (formSession) => [getUsingPPPsAnswers(formSession)['storing'] ?? []].flat().includes(option)
}

const storesAtOwnSites = stores(STORES_OWN)
const storesWithThirdParty = stores(STORES_THIRD_PARTY)

// After the own sites' pages, the third party's contact if ticked, otherwise the quantity.
const pageAfterOwnStorage = (formSession) =>
  storesWithThirdParty(formSession) ? STORAGE_CONTACT_PAGE : USING_QUANTITY_PAGE

function pageAfterStorageLocation(formSession) {
  return getUsingPPPsAnswers(formSession)['storageLocation'] === 'main-address'
    ? pageAfterOwnStorage(formSession)
    : OWN_STORAGE_ADDRESS_PAGE
}

function pageAfterStoring(formSession) {
  return storesAtOwnSites(formSession) ? STORAGE_LOCATION_PAGE : pageAfterOwnStorage(formSession)
}

export const JOURNEY = {
  '/business-contact': {
    sessionKey: 'primaryContact',
    next: () => '/business-name'
  },
  '/business-name': {
    sessionKey: 'businessName',
    next: () => ADDRESS_SEARCH_PAGE
  },
  [ADDRESS_SEARCH_PAGE]: {
    sessionKey: 'address',
    next: () => '/business-activities'
  },
  '/business-activities': {
    sessionKey: 'businessActivities',
    next: pageAfterBusinessActivities
  },
  // A `usingPPPs` page keeps its answer under formSession.usingPPPs rather
  // than at the top level.
  [WHO_APPLIES_PAGE]: {
    usingPPPs: true,
    sessionKey: 'whoApplies',
    next: pageAfterWhoApplies
  },
  [CONTRACTOR_ADDRESS_PAGE]: {
    usingPPPs: true,
    sessionKey: 'contractor',
    next: () => PPP_SECTORS_PAGE
  },
  [PPP_SECTORS_PAGE]: {
    usingPPPs: true,
    sessionKey: 'professionalSectors',
    next: pageAfterSectors
  },
  [AGRI_SUBSECTORS_PAGE]: {
    usingPPPs: true,
    sessionKey: 'agriSubsectors',
    next: pageAfterAgriSubsectors
  },
  [AMENITY_SUBSECTORS_PAGE]: {
    usingPPPs: true,
    sessionKey: 'amenitySubsectors',
    next: pageAfterAmenitySubsectors
  },
  [HORTI_SUBSECTORS_PAGE]: {
    usingPPPs: true,
    sessionKey: 'hortiSubsectors',
    next: () => USING_MEMBER_SCHEMES_PAGE
  },
  [USING_MEMBER_SCHEMES_PAGE]: {
    usingPPPs: true,
    sessionKey: 'memberSchemes',
    next: () => STORING_PAGE
  },
  [STORING_PAGE]: {
    usingPPPs: true,
    sessionKey: 'storing',
    next: pageAfterStoring
  },
  [STORAGE_LOCATION_PAGE]: {
    usingPPPs: true,
    sessionKey: 'storageLocation',
    next: pageAfterStorageLocation
  },
  [OWN_STORAGE_ADDRESS_PAGE]: {
    usingPPPs: true,
    sessionKey: 'ownStorageAddress',
    next: pageAfterOwnStorage
  },
  [STORAGE_CONTACT_PAGE]: {
    usingPPPs: true,
    sessionKey: 'storageContact',
    next: () => USING_QUANTITY_PAGE
  },
  [USING_QUANTITY_PAGE]: {
    usingPPPs: true,
    sessionKey: 'quantity',
    next: () => CHECK_ANSWERS_PAGE
  }
}

const JOURNEY_PAGES = Object.keys(JOURNEY)

const answersFor = (page, formSession) =>
  JOURNEY[page].usingPPPs ? getUsingPPPsAnswers(formSession) : formSession

const isAnswered = (page, formSession) =>
  page in JOURNEY && answersFor(page, formSession)[JOURNEY[page].sessionKey] !== undefined

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

// Pages after an unanswered one could still be asked, so only those before it
// count as skipped. Once the route reaches check answers, every page counts.
const routeEnd = (stoppedAt) =>
  stoppedAt === CHECK_ANSWERS_PAGE ? JOURNEY_PAGES.length : JOURNEY_PAGES.indexOf(stoppedAt)

const withoutKeys = (answers, keys) =>
  Object.fromEntries(Object.entries(answers).filter(([key]) => !keys.has(key)))

const keysIn = (pages, usingPPPs) =>
  new Set(
    pages
      .filter((page) => Boolean(JOURNEY[page].usingPPPs) === usingPPPs)
      .map((page) => JOURNEY[page].sessionKey)
  )

// Removes the skipped using PPPs answers, and formSession.usingPPPs itself once it's empty.
function withoutUsingPPPsKeys(formSession, keys) {
  if (!formSession[USING_PPPS_KEY]) {
    return formSession
  }

  const remaining = withoutKeys(formSession[USING_PPPS_KEY], keys)

  return Object.keys(remaining).length
    ? { ...formSession, [USING_PPPS_KEY]: remaining }
    : withoutKeys(formSession, new Set([USING_PPPS_KEY]))
}

export function removeSkippedAnswers(formSession) {
  const { answeredPages, stoppedAt } = followRoute(formSession)
  const skippedPages = JOURNEY_PAGES.slice(0, routeEnd(stoppedAt)).filter(
    (page) => !answeredPages.includes(page)
  )

  return withoutUsingPPPsKeys(
    withoutKeys(formSession, keysIn(skippedPages, false)),
    keysIn(skippedPages, true)
  )
}
