import { getSession } from '#/server/common/helpers/get-session.js'
import { redirectToNextPage } from '#/server/common/helpers/journey-navigation.js'
import { getNextPage, DISTRIBUTE_QUANTITY_PAGE } from '#/server/common/helpers/journey.js'
import {
  getDistributePPPsAnswers,
  setDistributePPPsAnswer
} from '#/server/common/helpers/distribute-ppps-answers.js'

export const get = {
  handler(request, h) {
    request.yar.set('formSession', getSession(request, 'formSession'))

    const formSession = getSession(request, 'formSession')

    return h.view('distribute/quantity/index', {
      values: { quantity: getDistributePPPsAnswers(formSession)['quantity'] }
    })
  }
}

// Joi has already turned the quantity into a number.
export const post = {
  handler(request, h) {
    const formSession = getSession(request, 'formSession')

    setDistributePPPsAnswer(formSession, 'quantity', request.payload['quantity'])
    request.yar.set('formSession', formSession)

    return redirectToNextPage(request, h, getNextPage(DISTRIBUTE_QUANTITY_PAGE, formSession))
  }
}
