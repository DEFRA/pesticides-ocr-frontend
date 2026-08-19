export const get = {
  handler(request, h) {
    request.yar.set('formSession', request.yar.get('formSession') ?? {})
    return h.view('pro-users/additional-business-address/additional-business-address')
  }
}

export const post = {
  handler(request, h) {
    const payload = request.payload
    const formSession = request.yar.get('formSession') ?? {}

    formSession['additionalAddresses'] = [{ address: payload }]
    request.yar.set('formSession', formSession)

    return h.redirect('/additional-addresses/contact')
  }
}
