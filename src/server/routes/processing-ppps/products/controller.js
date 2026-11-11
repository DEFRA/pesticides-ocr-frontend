import { getSession } from '#/server/common/helpers/get-session.js'
import { redirectToNextPage } from '#/server/common/helpers/journey-navigation.js'
import { getNextPage, PROCESSING_PRODUCTS_PAGE } from '#/server/common/helpers/journey.js'
import {
  getProcessingPPPsAnswers,
  setProcessingPPPsAnswer
} from '#/server/common/helpers/processing-ppps-answers.js'

export const get = {
  handler(request, h) {
    request.yar.set('formSession', getSession(request, 'formSession'))

    const formSession = getSession(request, 'formSession')

    return h.view('processing-ppps/products/index', {
      values: { products: getProcessingPPPsAnswers(formSession)['products'] }
    })
  }
}

export const post = {
  handler(request, h) {
    const formSession = getSession(request, 'formSession')

    setProcessingPPPsAnswer(formSession, 'products', request.payload['products'])
    request.yar.set('formSession', formSession)

    return redirectToNextPage(request, h, getNextPage(PROCESSING_PRODUCTS_PAGE, formSession))
  }
}
