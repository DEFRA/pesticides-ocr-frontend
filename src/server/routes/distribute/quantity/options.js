import { annualQuantityPayload } from '#/server/common/helpers/annual-quantity.js'
import { viewFailAction } from '#/server/common/helpers/view-fail-action.js'

export const app = {
  pageTitle:
    'What is the overall volume of PPPs, ingredients and adjuvants your business distributes in a typical year?'
}

export const validate = {
  payload: annualQuantityPayload(),
  failAction: viewFailAction('distribute/quantity/index')
}
