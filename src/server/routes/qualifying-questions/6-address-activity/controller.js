export const get = {
  handler(_request, h) {
    return h.view('qualifying-questions/6-address-activity/address-activity')
  },
  options: {
    app: {
      pageTitle: 'Address Activity'
    }
  }
}

export const post = {
  handler(_request, h) {
    return h.redirect('/quantity')
  }
}
