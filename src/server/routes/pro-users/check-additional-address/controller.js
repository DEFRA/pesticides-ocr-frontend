import { getSession } from '#/server/common/helpers/get-session.js'
import { buildLatestAddress } from './helpers/build-latest-address.js'
import { redirectToNextPage } from '#/server/common/helpers/journey-navigation.js'

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
      return redirectToNextPage(request, h, '/additional-addresses/address')
    }

    return redirectToNextPage(request, h, '/check-answers')
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
