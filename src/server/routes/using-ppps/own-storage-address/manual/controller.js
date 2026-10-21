import { getSession } from '#/server/common/helpers/get-session.js'
import { redirectToNextPage } from '#/server/common/helpers/journey-navigation.js'
import { getNextPage, OWN_STORAGE_ADDRESS_PAGE } from '#/server/common/helpers/journey.js'
import {
  OWN_STORAGE_ADDRESS_HEADING,
  readOwnStorageAddress,
  saveOwnStorageAddress
} from '../lookup.js'

// The journey's back link goes to check answers in change mode; this page goes
// back to the search instead, which keeps change mode itself.
export const manualPageContext = (request) => ({
  heading: OWN_STORAGE_ADDRESS_HEADING,
  backLink: `${OWN_STORAGE_ADDRESS_PAGE}${request.url.search}`
})

export const get = {
  handler(request, h) {
    const formSession = getSession(request, 'formSession')
    request.yar.set('formSession', formSession)

    return h.view('using-ppps/own-storage-address/manual/index', {
      ...manualPageContext(request),
      values: readOwnStorageAddress(formSession)
    })
  }
}

// Saves the same answer as the lookup, so the journey carries on from the own
// storage address page either way.
export const post = {
  handler(request, h) {
    const formSession = getSession(request, 'formSession')

    saveOwnStorageAddress(formSession, request.payload)
    request.yar.set('formSession', formSession)

    return redirectToNextPage(request, h, getNextPage(OWN_STORAGE_ADDRESS_PAGE, formSession))
  }
}
