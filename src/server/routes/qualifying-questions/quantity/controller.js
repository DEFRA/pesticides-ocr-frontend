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
    const quantity = payload['quantity-type'] === 'amount' ? payload['quantity-amount'] : payload['quantity-area']

    formSession['quantity'] = { 'quantity-type': payload['quantity-type'], quantity }
    request.yar.set('formSession', formSession)

    return h.redirect('/check-answers')
  }
}
