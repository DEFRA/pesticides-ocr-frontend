import { getSession } from '#/server/common/helpers/get-session.js'
import { VERIFY_EMAIL_PAGE } from '#/server/common/helpers/journey.js'

export const get = {
  handler(request, h) {
    request.yar.set('formSession', getSession(request, 'formSession'))

    return h.view('qualifying-questions/business-contact/index', {
      values: getSession(request, 'formSession')['primaryContact']
    })
  }
}

// Always on to check your email, even from check answers (?change=true), so a
// changed email address is verified too.
export const post = {
  handler(request, h) {
    const payload = request.payload
    const formSession = getSession(request, 'formSession')

    formSession['primaryContact'] = payload
    request.yar.set('formSession', formSession)

    return h.redirect(VERIFY_EMAIL_PAGE)
  }
}
