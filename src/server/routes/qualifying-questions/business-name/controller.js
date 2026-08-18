import { getSession } from '#/server/common/helpers/get-session.js'

export const get = {
  handler(request, h) {
    request.yar.set('formSession', request.yar.get('formSession') ?? {})
    return h.view('qualifying-questions/business-name/business-name')
  }
}

export const post = {
  handler(request, h) {
    const payload = request.payload['business-name']
    const formSession = getSession(request, 'formSession')

    formSession['business-name'] = payload
    request.yar.set('formSession', formSession)

    return h.redirect('/business-address')
  }
}
