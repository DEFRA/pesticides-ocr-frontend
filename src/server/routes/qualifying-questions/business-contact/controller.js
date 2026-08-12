export const get = {
  handler(request, h) {
    request.yar.set('formSession', request.yar.get('formSession') ?? {})
    return h.view('qualifying-questions/business-contact/business-contact')
  }
}

export const post = {
  handler(request, h) {
    const payload = request.payload
    const formSession = request.yar.get('formSession')

    formSession['primary-contact'] = payload
    request.yar.set('formSession', formSession)

    return h.redirect('/address-activity')
  }
}
