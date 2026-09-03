export const get = {
  handler(request, h) {
    request.yar.set('formSession', request.yar.get('formSession') ?? {})
    return h.view('qualifying-questions/quantity/quantity')
  }
}

export const post = {
  handler(request, h) {
    const payload = request.payload
    const formSession = request.yar.get('formSession') ?? {}
    const quantity = payload['quantityType'] === 'amount' ? payload['quantityAmount'] : payload['quantityArea']

    formSession['quantity'] = { quantityType: payload['quantityType'], quantity }
    request.yar.set('formSession', formSession)

    if (formSession['businessActivities'].length === 1 &&
        formSession['businessActivities'][0] === 'seller-amateur') {
      return h.redirect('/check-answers')
    }

    return h.redirect('/professional-sectors')
  }
}
