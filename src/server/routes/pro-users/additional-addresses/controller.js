import { redirectToNextPage } from '#/server/common/helpers/journey-navigation.js'
import { CHECK_ANSWERS_PAGE } from '#/server/common/helpers/journey.js'
import { getSession } from '#/server/common/helpers/get-session.js'
import { removeUnfinishedAddresses } from '#/server/common/helpers/additional-addresses.js'

export const get = {
  handler(_request, h) {
    return h.view('pro-users/additional-addresses/index')
  }
}

export const post = {
  handler(request, h) {
    const payload = request.payload['additionalAddresses']

    if (payload === 'no') {
      return redirectToNextPage(request, h, CHECK_ANSWERS_PAGE)
    }

    request.yar.set('formSession', removeUnfinishedAddresses(getSession(request, 'formSession')))

    return redirectToNextPage(request, h, '/additional-addresses/address')
  }
}
