const FIRST_PAGE = '/business-activities'
export const CHECK_ANSWERS_PAGE = '/check-answers'

// The sell section isn't built yet, so this route doesn't exist and the
// journey stops here for anyone who only sells PPPs.
export const SELL_SECTION_PAGE = '/sell'

// Where an organisation that uses PPPs says which sectors its PPP activities
// are in, after who applies them (and the contractor's details, if any). See
// routes/using-ppps/ppp-sectors.
export const PPP_SECTORS_PAGE = '/ppp-sectors'

// Where an organisation that uses a contractor gives the contractor's name and
// address (see routes/using-ppps/contractor-address).
export const CONTRACTOR_ADDRESS_PAGE = '/contractor-address'

// The pages after the PPP sectors aren't built yet, so these routes don't exist
// and the journey stops at whichever one the sectors lead to.
export const AGRI_SUBSECTORS_PAGE = '/agri-subsectors'
export const AMENITY_SUBSECTOR_PAGE = '/amenity-subsector'
export const HORTI_SUBSECTOR_PAGE = '/horti-subsector'
export const STORING_PAGE = '/storing'

const onlySellsProducts = ({ businessActivities = [] }) =>
  businessActivities.length === 1 && businessActivities[0] === 'selling'

const usesProducts = ({ businessActivities = [] }) => businessActivities.includes('using')

// professionalSectors holds the chosen sector values, or just the Other text.
function worksIn(sector) {
  return ({ professionalSectors = [] }) => professionalSectors.includes(sector)
}

const worksInAgriculture = worksIn('agriculture')
const worksInAmenity = worksIn('amenity')
const worksInHorticulture = worksIn('horticulture')

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

export const JOURNEY = {
  '/business-activities': {
    sessionKey: 'businessActivities',
    next: () => '/business-name'
  },
  '/business-name': {
    sessionKey: 'businessName',
    next: (formSession) =>
      onlySellsProducts(formSession) ? SELL_SECTION_PAGE : '/business-address'
  },
  '/business-address': {
    sessionKey: 'address',
    next: () => '/business-contact'
  },
  '/business-contact': {
    sessionKey: 'primaryContact',
    next: (formSession) => (usesProducts(formSession) ? '/who-applies' : '/address-activity')
  },
  '/who-applies': {
    sessionKey: 'whoApplies',
    next: (formSession) =>
      formSession['whoApplies'] === 'contractor' ? CONTRACTOR_ADDRESS_PAGE : PPP_SECTORS_PAGE
  },
  '/contractor-address': {
    sessionKey: 'contractor',
    next: () => PPP_SECTORS_PAGE
  },
  '/ppp-sectors': {
    sessionKey: 'professionalSectors',
    next: pageAfterSectors
  },
  '/address-activity': {
    sessionKey: 'addressActivities',
    next: (formSession) =>
      formSession['addressActivities'].includes('use') ? '/quantity' : CHECK_ANSWERS_PAGE
  },
  '/quantity': {
    sessionKey: 'quantity',
    next: () => '/member-schemes'
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

const isAnswered = (page, formSession) =>
  page in JOURNEY &&
  (JOURNEY[page].optional || formSession[JOURNEY[page].sessionKey] !== undefined)

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

export function removeSkippedAnswers(formSession) {
  const { answeredPages, stoppedAt } = followRoute(formSession)
  const knownRouteEnd = routeEnd(answeredPages, stoppedAt)

  const skippedKeys = new Set(
    JOURNEY_PAGES.slice(0, knownRouteEnd)
      .filter((page) => !answeredPages.includes(page))
      .map((page) => JOURNEY[page].sessionKey)
  )

  return Object.fromEntries(
    Object.entries(formSession).filter(([key]) => !skippedKeys.has(key))
  )
}
