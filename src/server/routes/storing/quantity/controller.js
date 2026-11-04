import { getSession } from '#/server/common/helpers/get-session.js'
import { redirectToNextPage } from '#/server/common/helpers/journey-navigation.js'
import { getNextPage, STORE_QUANTITY_PAGE } from '#/server/common/helpers/journey.js'
import {
  getStorePPPsAnswers,
  setStorePPPsAnswer
} from '#/server/common/helpers/store-ppps-answers.js'

export const get = {
  handler(request, h) {
    request.yar.set('formSession', getSession(request, 'formSession'))

    const formSession = getSession(request, 'formSession')

    return h.view('storing/quantity/index', {
      values: { quantity: getStorePPPsAnswers(formSession)['quantity'] }
    })
  }
}

// Joi has already turned the quantity into a number.
export const post = {
  handler(request, h) {
    const formSession = getSession(request, 'formSession')

    setStorePPPsAnswer(formSession, 'quantity', request.payload['quantity'])
    request.yar.set('formSession', formSession)

    return redirectToNextPage(request, h, getNextPage(STORE_QUANTITY_PAGE, formSession))
  }
}
