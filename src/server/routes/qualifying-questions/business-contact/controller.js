export const get = {
  handler(_request, h) {
    return h.view('qualifying-questions/business-contact/business-contact')
  }
}

export const post = {
  handler(_request, h) {
    return h.redirect('/address-activity')
  }
}
