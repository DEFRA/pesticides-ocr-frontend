import { getSession } from '#/server/common/helpers/get-session.js'
import { buildLatestAddress } from './helpers/build-latest-address.js'
import { redirectToNextPage } from '#/server/common/helpers/journey-navigation.js'
import { CHECK_ANSWERS_PAGE } from '#/server/common/helpers/journey.js'
import { removeUnfinishedAddresses } from '#/server/common/helpers/additional-addresses.js'

export const get = {
  handler(request, h) {
    const formSession = getSession(request, 'formSession')
    const additionalAddresses = formSession['additionalAddresses'] ?? []

    return h.view('pro-users/check-additional-address/index', {
      address: buildLatestAddress(additionalAddresses)
    })
  }
}

export const post = {
  handler(request, h) {
    const payload = request.payload['checkAdditionalAddress']

    if (payload === 'yes') {
      request.yar.set('formSession', removeUnfinishedAddresses(getSession(request, 'formSession')))

      return redirectToNextPage(request, h, '/additional-addresses/address')
    }

    return redirectToNextPage(request, h, CHECK_ANSWERS_PAGE)
  }
}

export const removeLatest = {
  handler(request, h) {
    const formSession = getSession(request, 'formSession')
    const additionalAddresses = formSession['additionalAddresses'] ?? []

    additionalAddresses.pop()

    formSession['additionalAddresses'] = additionalAddresses
    request.yar.set('formSession', formSession)

    return h.redirect('/additional-addresses')
  }
}
