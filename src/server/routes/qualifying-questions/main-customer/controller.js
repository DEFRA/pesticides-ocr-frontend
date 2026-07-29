export const get = {
  handler(_request, h) {
    return h.view('qualifying-questions/main-customer/main-customer')
  }
}

export const post = {
  handler(_request, h) {
    return h.redirect('/business-name')
  }
}
