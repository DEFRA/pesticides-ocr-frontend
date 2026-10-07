import { getSession } from '#/server/common/helpers/get-session.js'
import { redirectToNextPage } from '#/server/common/helpers/journey-navigation.js'

export const get = {
  handler(request, h) {
    request.yar.set('formSession', getSession(request, 'formSession'))

    const current = getSession(request, 'formSession')['additionalAddresses']?.at(-1)

    return h.view('pro-users/additional-business-contact/index', {
      values: current?.contact
    })
  }
}

export const post = {
  handler(request, h) {
    const formSession = getSession(request, 'formSession')
    const additionalAddresses = formSession['additionalAddresses'] ?? []
    const current = additionalAddresses.at(-1)

    if (current) {
      current.contact = request.payload
    } else {
      additionalAddresses.push({ contact: request.payload })
    }

    formSession['additionalAddresses'] = additionalAddresses
    request.yar.set('formSession', formSession)

    return redirectToNextPage(request, h, '/additional-addresses/activity')
  }
}
