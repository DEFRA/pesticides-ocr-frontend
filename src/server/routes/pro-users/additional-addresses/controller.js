export const get = {
  handler(_request, h) {
    return h.view('pro-users/additional-addresses/additional-addresses')
  }
}

export const post = {
  handler(request, h) {
    const payload = request.payload['additional-addresses']

    if (payload === 'no') {
      return h.redirect('/check-answers')
    }

    return h.redirect('/additional-addresses/address')
  }
}
