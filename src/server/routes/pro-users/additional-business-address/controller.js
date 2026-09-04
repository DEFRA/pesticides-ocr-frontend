import { getSession } from '#/server/common/helpers/get-session.js'

export const get = {
  handler(request, h) {
    request.yar.set('formSession', getSession(request, 'formSession'))
    return h.view(
      'pro-users/additional-business-address/additional-business-address'
    )
  }
}

export const post = {
  handler(request, h) {
    const formSession = getSession(request, 'formSession')
    const additionalAddresses = formSession['additionalAddresses'] ?? []
    const current = additionalAddresses.at(-1)

    if (current && !current.contact) {
      current.address = request.payload
    } else {
      additionalAddresses.push({ address: request.payload })
    }

    formSession['additionalAddresses'] = additionalAddresses
    request.yar.set('formSession', formSession)

    return h.redirect('/additional-addresses/contact')
  }
}
