export const get = {
  handler(_request, h) {
    return h.view('qualifying-questions/business-address/business-address')
  }
}

export const post = {
  handler(_request, h) {
    return h.redirect('/business-contact')
  }
}
