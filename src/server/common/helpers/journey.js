const FIRST_PAGE = '/business-activities'
export const CHECK_ANSWERS_PAGE = '/check-answers'

// The sell section isn't built yet, so this route doesn't exist and the
// journey stops here for anyone who only sells PPPs.
export const SELL_SECTION_PAGE = '/sell'

// The PPP sectors page isn't built yet, so this route doesn't exist and the
// journey stops here for organisations that apply PPPs themselves.
export const PPP_SECTORS_PAGE = '/ppp-sectors'

// The contractor address capture page isn't built yet, so this route doesn't
// exist and the journey stops here for organisations that use a contractor.
// The path is a placeholder: rename it once the page is designed.
export const CONTRACTOR_ADDRESS_PAGE = '/contractor-address'

const onlySellsProducts = ({ businessActivities = [] }) =>
  businessActivities.length === 1 && businessActivities[0] === 'selling'

const usesProducts = ({ businessActivities = [] }) => businessActivities.includes('using')

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
  '/address-activity': {
    sessionKey: 'addressActivities',
    next: (formSession) =>
      formSession['addressActivities'].includes('use') ? '/quantity' : CHECK_ANSWERS_PAGE
  },
  '/quantity': {
    sessionKey: 'quantity',
    next: () => '/professional-sectors'
  },
  '/professional-sectors': {
    sessionKey: 'professionalSectors',
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
