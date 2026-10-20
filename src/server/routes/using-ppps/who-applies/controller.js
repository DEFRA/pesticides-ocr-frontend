import { getSession } from '#/server/common/helpers/get-session.js'
import { redirectToNextPage } from '#/server/common/helpers/journey-navigation.js'
import { getNextPage } from '#/server/common/helpers/journey.js'

export const get = {
  handler(request, h) {
    request.yar.set('formSession', getSession(request, 'formSession'))

    const formSession = getSession(request, 'formSession')

    return h.view('using-ppps/who-applies/index', {
      values: { whoApplies: formSession['whoApplies'] }
    })
  }
}

export const post = {
  handler(request, h) {
    const formSession = getSession(request, 'formSession')

    formSession['whoApplies'] = request.payload['whoApplies']
    request.yar.set('formSession', formSession)

    return redirectToNextPage(request, h, getNextPage('/who-applies', formSession))
  }
}
