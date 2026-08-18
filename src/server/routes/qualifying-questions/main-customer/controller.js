export const get = {
  handler(request, h) {
    request.yar.set('formSession', request.yar.get('formSession') ?? {})
    return h.view('qualifying-questions/main-customer/main-customer')
  }
}

export const post = {
  handler(request, h) {
    const payload = request.payload['main-customer']
    const formSession = request.yar.get('formSession') ?? {}

    formSession['main-customer'] = payload
    request.yar.set('formSession', formSession)
    return h.redirect('/business-name')
  }
}
