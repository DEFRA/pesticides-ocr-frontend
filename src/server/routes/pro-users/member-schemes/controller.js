import { getSession } from '#/server/common/helpers/get-session.js'

export const get = {
  handler(request, h) {
    request.yar.set('formSession', request.yar.get('formSession') ?? {})
    return h.view('pro-users/member-schemes/member-schemes')
  }
}

export const post = {
  handler(request, h) {
    const schemes = request.payload['member-schemes']
    const other = request.payload['member-schemes-other']
    const formSession = getSession(request, 'formSession')

    formSession['member-schemes'] = schemes ?? [other]
    request.yar.set('formSession', formSession)

    return h.redirect('/additional-addresses')
  }
}
