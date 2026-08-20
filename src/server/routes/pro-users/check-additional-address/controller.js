import { getSession } from '#/server/common/helpers/get-session.js'
import { buildLatestAddress } from './helpers/build-latest-address.js'

export const get = {
  handler(request, h) {
    const formSession = getSession(request, 'formSession')
    const additionalAddresses = formSession['additional-addresses'] ?? []

    return h.view('pro-users/check-additional-address/check-additional-address', {
      address: buildLatestAddress(additionalAddresses)
    })
  }
}

export const post = {
  handler(request, h) {
    const payload = request.payload['check-additional-address']

    if (payload === 'yes') {
      return h.redirect('/additional-addresses/address')
    }

    return h.redirect('/check-answers')
  }
}

export const removeLatest = {
  handler(request, h) {
    const formSession = getSession(request, 'formSession')
    const additionalAddresses = formSession['additional-addresses'] ?? []

    additionalAddresses.pop()

    formSession['additional-addresses'] = additionalAddresses
    request.yar.set('formSession', formSession)

    return h.redirect('/additional-addresses')
  }
}
