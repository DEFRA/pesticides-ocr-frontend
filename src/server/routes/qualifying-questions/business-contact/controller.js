export const get = {
  handler(_request, h) {
    return h.view('qualifying-questions/business-contact/business-contact')
  },
  options: {
    app: {
      pageTitle: 'Business Contact'
    }
  }
}

export const post = {
  handler(_request, h) {
    return h.redirect('/address-activity')
  }
}
