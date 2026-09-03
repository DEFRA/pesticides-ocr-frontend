import { getSession } from '#/server/common/helpers/get-session.js'

export const get = {
  handler(request, h) {
    request.yar.set('formSession', request.yar.get('formSession') ?? {})
    return h.view('pro-users/member-schemes/member-schemes')
  }
}

export const post = {
  handler(request, h) {
    const schemes = request.payload['memberSchemes']
    const other = request.payload['memberSchemesOther']
    const formSession = getSession(request, 'formSession')

    formSession['memberSchemes'] = schemes ?? [other]
    request.yar.set('formSession', formSession)

    return h.redirect('/additional-addresses')
  }
}
