import { getSession } from '#/server/common/helpers/get-session.js'

export const get = {
  handler(request, h) {
    request.yar.set('formSession', getSession(request, 'formSession'))

    const current = getSession(request, 'formSession')['additionalAddresses']?.at(-1)
    const currentAddressLineOne = current?.['address']?.['addressLine1']

    return h.view('pro-users/additional-business-activity/index', {
      currentAddressLineOne,
      values: { addressActivities: current?.activity }
    })
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
