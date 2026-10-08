import { redirectToNextPage } from '#/server/common/helpers/journey-navigation.js'

export const get = {
  handler(_request, h) {
    return h.view('pro-users/additional-addresses/index')
  }
}

export const post = {
  handler(request, h) {
    const payload = request.payload['additionalAddresses']

    if (payload === 'no') {
      return redirectToNextPage(request, h, '/check-answers')
    }

    return redirectToNextPage(request, h, '/additional-addresses/address')
  }
}
