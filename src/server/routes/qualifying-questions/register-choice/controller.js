import { getSession } from '#/server/common/helpers/get-session.js'

// Option 1: the existing magic-link registration journey. Email verification
// (business-contact -> check-your-email -> verify-email) now opens the
// journey, before business name/address/activities.
const FIRST_TIME_PAGE = '/business-contact'

// Option 2: backend support for updating an existing registration isn't
// available yet. This stub page is a placeholder until that work is
// picked up in a future sprint.
const UPDATE_EXISTING_PAGE = '/update-registration'

export const get = {
  handler(request, h) {
    request.yar.set('formSession', request.yar.get('formSession') ?? {})

    return h.view('qualifying-questions/register-choice/index', {
      values: { registerChoice: getSession(request, 'formSession')['registerChoice'] }
    })
  }
}

export const post = {
  handler(request, h) {
    const payload = request.payload['registerChoice']
    const formSession = getSession(request, 'formSession')

    formSession['registerChoice'] = payload
    request.yar.set('formSession', formSession)

    return h.redirect(payload === 'update' ? UPDATE_EXISTING_PAGE : FIRST_TIME_PAGE)
  }
}
