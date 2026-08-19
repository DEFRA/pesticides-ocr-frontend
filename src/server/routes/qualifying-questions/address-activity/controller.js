import { getSession } from '#/server/common/helpers/get-session.js'

export const get = {
  handler(request, h) {
    request.yar.set('formSession', request.yar.get('formSession') ?? {})
    return h.view('qualifying-questions/address-activity/address-activity')
  }
}

export const post = {
  handler(request, h) {
    const payload = request.payload['address-activities']
    const formSession = getSession(request, 'formSession')

    formSession['address-activities'] = payload
    request.yar.set('formSession', formSession)

    if (payload.includes('use')) {
      return h.redirect('/quantity')
    }

    return h.redirect('/check-answers')
  }
}
