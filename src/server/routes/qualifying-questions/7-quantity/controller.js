export const get = {
  handler(_request, h) {
    return h.view('qualifying-questions/7-quantity/quantity')
  },
  options: {
    app: {
      pageTitle: 'Quantity'
    }
  }
}

export const post = {
  handler(_request, h) {
    return h.redirect('/check-answers')
  }
}
