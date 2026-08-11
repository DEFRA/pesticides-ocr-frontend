export const get = {
  handler(request, h) {
    request.yar.set('formSession', request.yar.get('formSession') ?? {})
    return h.view('qualifying-questions/business-activities/business-activities')
  }
}

export const post = {
  handler(request, h) {
    const payload = request.payload
    const formSession = request.yar.get('formSession')

    formSession['business-activities'] = payload['business-activities']
    request.yar.set('formSession', formSession)

    return h.redirect('/main-customer')
  }
}
