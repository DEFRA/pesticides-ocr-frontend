export const get = {
  handler(_request, h) {
    return h.view('qualifying-questions/2-main-customer/main-customer')
  },
  options: {
    app: {
      pageTitle: 'Main Customer'
    }
  }
}

export const post = {
  handler(_request, h) {
    return h.redirect('/business-name')
  }
}
