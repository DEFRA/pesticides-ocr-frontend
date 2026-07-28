export const get = {
  handler(_request, h) {
    return h.view('qualifying-questions/business-name/business-name')
  },
  options: {
    app: {
      pageTitle: 'Business Name'
    }
  }
}

export const post = {
  handler(_request, h) {
    return h.redirect('/business-address')
  }
}
