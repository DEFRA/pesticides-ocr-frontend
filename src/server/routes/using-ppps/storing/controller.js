import { getSession } from '#/server/common/helpers/get-session.js'
import { redirectToNextPage } from '#/server/common/helpers/journey-navigation.js'
import { getNextPage, STORING_PAGE } from '#/server/common/helpers/journey.js'
import {
  getUsingPPPsAnswers,
  setUsingPPPsAnswer
} from '#/server/common/helpers/using-ppps-answers.js'

export const get = {
  handler(request, h) {
    request.yar.set('formSession', getSession(request, 'formSession'))

    const formSession = getSession(request, 'formSession')

    return h.view('using-ppps/storing/index', {
      values: { storing: getUsingPPPsAnswers(formSession)['storing'] }
    })
  }
}

export const post = {
  handler(request, h) {
    const formSession = getSession(request, 'formSession')

    setUsingPPPsAnswer(formSession, 'storing', request.payload['storing'])
    request.yar.set('formSession', formSession)

    return redirectToNextPage(request, h, getNextPage(STORING_PAGE, formSession))
  }
}
