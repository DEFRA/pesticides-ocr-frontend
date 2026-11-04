import { getSession } from '#/server/common/helpers/get-session.js'
import { redirectToNextPage } from '#/server/common/helpers/journey-navigation.js'
import { getNextPage, STORE_PRODUCTS_PAGE } from '#/server/common/helpers/journey.js'
import {
  getStorePPPsAnswers,
  setStorePPPsAnswer
} from '#/server/common/helpers/store-ppps-answers.js'

export const get = {
  handler(request, h) {
    request.yar.set('formSession', getSession(request, 'formSession'))

    const formSession = getSession(request, 'formSession')

    return h.view('storing/products/index', {
      values: { products: getStorePPPsAnswers(formSession)['products'] }
    })
  }
}

export const post = {
  handler(request, h) {
    const formSession = getSession(request, 'formSession')

    setStorePPPsAnswer(formSession, 'products', request.payload['products'])
    request.yar.set('formSession', formSession)

    return redirectToNextPage(request, h, getNextPage(STORE_PRODUCTS_PAGE, formSession))
  }
}
