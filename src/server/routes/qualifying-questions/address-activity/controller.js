export const get = {
  handler(_request, h) {
    return h.view('qualifying-questions/address-activity/address-activity')
  }
}

export const post = {
  handler(_request, h) {
    return h.redirect('/quantity')
  }
}
