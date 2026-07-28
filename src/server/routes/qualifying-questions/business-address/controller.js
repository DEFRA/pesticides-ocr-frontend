export const get = {
  handler(_request, h) {
    return h.view('qualifying-questions/business-address/business-address')
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
