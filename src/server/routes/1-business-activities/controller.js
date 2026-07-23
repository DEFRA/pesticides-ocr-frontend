export const get = {
  handler(_request, h) {
    return h.view('1-business-activities/business-activities')
  },
  options: {
    app: {
      pageTitle: 'Business Activities'
    }
  }
}

export const post = {
  handler(_request, h) {
    return h.redirect('/main-customer')
  }
}
