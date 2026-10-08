const FIRST_PAGE = '/business-activities'
export const CHECK_ANSWERS_PAGE = '/check-answers'

const onlySellsAmateurProducts = (formSession) =>
  formSession['businessActivities'].length === 1 &&
  formSession['businessActivities'][0] === 'seller-amateur'

export const JOURNEY = {
  '/business-activities': {
    sessionKey: 'businessActivities',
    next: (formSession) =>
      onlySellsAmateurProducts(formSession) ? '/business-name' : '/main-customer'
  },
  '/main-customer': {
    sessionKey: 'mainCustomer',
    next: () => '/business-name'
  },
  '/business-name': {
    sessionKey: 'businessName',
    next: () => '/business-address'
  },
  '/business-address': {
    sessionKey: 'address',
    next: () => '/business-contact'
  },
  '/business-contact': {
    sessionKey: 'primaryContact',
    next: () => '/address-activity'
  },
  '/address-activity': {
    sessionKey: 'addressActivities',
    next: (formSession) =>
      formSession['addressActivities'].includes('use') ? '/quantity' : CHECK_ANSWERS_PAGE
  },
  '/quantity': {
    sessionKey: 'quantity',
    next: (formSession) =>
      onlySellsAmateurProducts(formSession) ? CHECK_ANSWERS_PAGE : '/professional-sectors'
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
  JOURNEY[page].optional || formSession[JOURNEY[page].sessionKey] !== undefined

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

export function isOnRoute(page, formSession) {
  return followRoute(formSession).answeredPages.includes(page)
}

export function removeSkippedAnswers(formSession) {
  const { answeredPages, stoppedAt } = followRoute(formSession)
  const knownRouteEnd = stoppedAt === CHECK_ANSWERS_PAGE ? JOURNEY_PAGES.length : JOURNEY_PAGES.indexOf(stoppedAt)

  const skippedKeys = JOURNEY_PAGES.slice(0, knownRouteEnd)
    .filter((page) => !answeredPages.includes(page))
    .map((page) => JOURNEY[page].sessionKey)

  return Object.fromEntries(
    Object.entries(formSession).filter(([key]) => !skippedKeys.includes(key))
  )
}
