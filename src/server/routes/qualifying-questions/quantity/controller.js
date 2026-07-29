export const get = {
  handler(_request, h) {
    return h.view('qualifying-questions/quantity/quantity')
  }
}

export const post = {
  handler(_request, h) {
    return h.redirect('/check-answers')
  }
}
