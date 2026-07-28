export const get = {
  handler(_request, h) {
    return h.view('qualifying-questions/not-eligible/not-eligible')
  },
  options: {
    app: {
      pageTitle: 'Not Eligible'
    }
  }
}
