import { getSession } from '#/server/common/helpers/get-session.js'

export const get = {
  handler(request, h) {
    request.yar.set('formSession', request.yar.get('formSession') ?? {})
    return h.view('qualifying-questions/main-customer/main-customer')
  }
}

export const post = {
  handler(request, h) {
    const payload = request.payload['mainCustomer']
    const formSession = getSession(request, 'formSession')

    formSession['mainCustomer'] = payload
    request.yar.set('formSession', formSession)
    return h.redirect('/business-name')
  }
}
