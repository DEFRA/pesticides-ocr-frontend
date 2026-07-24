export const get = {
  handler(_request, h) {
    return h.view('qualifying-questions/4-business-address/business-address')
  },
  options: {
    app: {
      pageTitle: 'Business Address'
    }
  }
}

export const post = {
  handler(_request, h) {
    return h.redirect('/business-contact')
  }
}
