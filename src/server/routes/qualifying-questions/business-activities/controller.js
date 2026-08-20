import { getSession } from '#/server/common/helpers/get-session.js'

export const get = {
  handler(request, h) {
    request.yar.set('formSession', request.yar.get('formSession') ?? {})
    return h.view('qualifying-questions/business-activities/business-activities')
  }
}

export const post = {
  handler(request, h) {
    const payload = request.payload['business-activities']
    const formSession = getSession(request, 'formSession')

    formSession['business-activities'] = payload
    request.yar.set('formSession', formSession)

    if (payload.includes('seller-amateur')) {
      return h.redirect('/business-name')
    }

    return h.redirect('/main-customer')
  }
}
