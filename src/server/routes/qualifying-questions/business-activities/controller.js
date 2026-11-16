import { getSession } from '#/server/common/helpers/get-session.js'
import { redirectToNextPage } from '#/server/common/helpers/journey-navigation.js'
import { getNextPage } from '#/server/common/helpers/journey.js'

export const get = {
  handler(request, h) {
    const formSession = getSession(request, 'formSession')
    request.yar.set('formSession', formSession)

    return h.view('qualifying-questions/business-activities/index', {
      values: { businessActivities: formSession['businessActivities'] }
    })
  }
}

export const post = {
  handler(request, h) {
    const payload = request.payload['businessActivities']
    const formSession = getSession(request, 'formSession')

    formSession['businessActivities'] = payload
    request.yar.set('formSession', formSession)

    return redirectToNextPage(request, h, getNextPage('/business-activities', formSession))
  }
}
