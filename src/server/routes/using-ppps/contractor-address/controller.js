import { getSession } from '#/server/common/helpers/get-session.js'
import { redirectToNextPage } from '#/server/common/helpers/journey-navigation.js'
import { CONTRACTOR_ADDRESS_PAGE, getNextPage } from '#/server/common/helpers/journey.js'
import {
  getUsingPPPsAnswers,
  setUsingPPPsAnswer
} from '#/server/common/helpers/using-ppps-answers.js'

// The form is flat, but the answer keeps the address in its own object, the
// same shape as the business address, so the address helpers work on it as is.
export const get = {
  handler(request, h) {
    request.yar.set('formSession', getSession(request, 'formSession'))

    const { contractor } = getUsingPPPsAnswers(getSession(request, 'formSession'))

    return h.view('using-ppps/contractor-address/index', {
      values: contractor && { contractorName: contractor.contractorName, ...contractor.address }
    })
  }
}

export const post = {
  handler(request, h) {
    const formSession = getSession(request, 'formSession')
    const { contractorName, ...address } = request.payload

    setUsingPPPsAnswer(formSession, 'contractor', { contractorName, address })
    request.yar.set('formSession', formSession)

    return redirectToNextPage(request, h, getNextPage(CONTRACTOR_ADDRESS_PAGE, formSession))
  }
}
