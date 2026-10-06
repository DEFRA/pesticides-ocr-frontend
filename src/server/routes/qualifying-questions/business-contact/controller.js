import { getSession } from '#/server/common/helpers/get-session.js'

export const get = {
  handler(request, h) {
    request.yar.set('formSession', request.yar.get('formSession') ?? {})

    return h.view('qualifying-questions/business-contact/index', {
      values: getSession(request, 'formSession')['primaryContact']
    })
  }
}

export const post = {
  handler(request, h) {
    const payload = request.payload
    const formSession = request.yar.get('formSession') ?? {}

    formSession['primaryContact'] = payload
    request.yar.set('formSession', formSession)

    return h.redirect('/address-activity')
  }
}
