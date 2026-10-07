import { getSession } from '#/server/common/helpers/get-session.js'
import { redirectToNextPage } from '#/server/common/helpers/journey-navigation.js'
import { getNextPage } from '#/server/common/helpers/journey.js'

export const get = {
  handler(request, h) {
    request.yar.set('formSession', request.yar.get('formSession') ?? {})

    return h.view('qualifying-questions/main-customer/index', {
      values: { mainCustomer: getSession(request, 'formSession')['mainCustomer'] }
    })
  }
}

export const post = {
  handler(request, h) {
    const payload = request.payload['mainCustomer']
    const formSession = getSession(request, 'formSession')

    formSession['mainCustomer'] = payload
    request.yar.set('formSession', formSession)

    return redirectToNextPage(request, h, getNextPage('/main-customer', formSession))
  }
}
