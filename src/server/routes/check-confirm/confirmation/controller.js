export const get = {
  handler(request, h) {
    let reference
    const formSession = request.yar.get('formSession') ?? {}

    if (formSession['confirmation-reference']) {
      reference = formSession['confirmation-reference']
    } else {
      throw new Error('Confirmation reference not found in session data')
    }

    return h.view('check-confirm/confirmation/confirmation', {
      reference
    })
  }
}
