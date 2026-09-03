import { getSession } from '#/server/common/helpers/get-session.js'

export const get = {
  handler(request, h) {
    request.yar.set('formSession', getSession(request, 'formSession'))

    const currentAddressLineOne = getSession(request, 'formSession')['additional-addresses']?.at(-1)['address']['address-line-1']

    return h.view('pro-users/additional-business-activity/additional-business-activity', { currentAddressLineOne })
  }
}

export const post = {
  handler(request, h) {
    const payload = request.payload['addressActivities']
    const formSession = getSession(request, 'formSession')
    const additionalAddresses = formSession['additionalAddresses'] ?? []
    const current = additionalAddresses.at(-1)

    if (current) {
      current.activity = payload
    } else {
      additionalAddresses.push({ activity: payload })
    }

    formSession['additionalAddresses'] = additionalAddresses
    request.yar.set('formSession', formSession)

    return h.redirect('/check-additional-address')
  }
}
