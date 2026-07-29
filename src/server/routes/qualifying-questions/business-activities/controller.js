export const get = {
  handler(_request, h) {
    return h.view('qualifying-questions/business-activities/business-activities')
  }
}

export const post = {
  handler(_request, h) {
    return h.redirect('/main-customer')
  }
}
