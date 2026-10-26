import { getSession } from '#/server/common/helpers/get-session.js'
import { redirectToNextPage } from '#/server/common/helpers/journey-navigation.js'
import { getNextPage, DISTRIBUTE_PRODUCTS_PAGE } from '#/server/common/helpers/journey.js'
import {
  getDistributePPPsAnswers,
  setDistributePPPsAnswer
} from '#/server/common/helpers/distribute-ppps-answers.js'

export const get = {
  handler(request, h) {
    request.yar.set('formSession', getSession(request, 'formSession'))

    const formSession = getSession(request, 'formSession')

    return h.view('distribute/products/index', {
      values: { products: getDistributePPPsAnswers(formSession)['products'] }
    })
  }
}

export const post = {
  handler(request, h) {
    const formSession = getSession(request, 'formSession')

    setDistributePPPsAnswer(formSession, 'products', request.payload['products'])
    request.yar.set('formSession', formSession)

    return redirectToNextPage(request, h, getNextPage(DISTRIBUTE_PRODUCTS_PAGE, formSession))
  }
}
