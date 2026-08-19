import { getSession } from '#/server/common/helpers/get-session.js'

export const get = {
  handler(request, h) {
    request.yar.set('formSession', getSession(request, 'formSession'))
    return h.view(
      'pro-users/additional-business-activity/additional-business-activity'
    )
  }
}

export const post = {
  handler(request, h) {
    const payload = request.payload['address-activities']
    const formSession = getSession(request, 'formSession')
    const additionalAddresses = formSession['additional-addresses'] ?? []
    const current = additionalAddresses.at(-1)

    if (current) {
      current.activity = payload
    } else {
      additionalAddresses.push({ activity: payload })
    }

    formSession['additional-addresses'] = additionalAddresses
    request.yar.set('formSession', formSession)

    return h.redirect('/check-additional-address')
  }
}
