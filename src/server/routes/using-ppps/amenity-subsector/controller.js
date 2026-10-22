import { getSession } from '#/server/common/helpers/get-session.js'
import { splitOtherAnswer } from '#/server/common/helpers/split-other-answer.js'
import { redirectToNextPage } from '#/server/common/helpers/journey-navigation.js'
import { AMENITY_SUBSECTOR_PAGE, getNextPage } from '#/server/common/helpers/journey.js'
import {
  getUsingPPPsAnswers,
  setUsingPPPsAnswer
} from '#/server/common/helpers/using-ppps-answers.js'
import { amenitySubsectorsValues } from './items.js'

// The answer is either the chosen amenity sector values or, when only
// Other is given, a single-item list holding the Other text.
export const get = {
  handler(request, h) {
    request.yar.set('formSession', getSession(request, 'formSession'))

    const { selected, other } = splitOtherAnswer(
      getUsingPPPsAnswers(getSession(request, 'formSession'))['amenitySubsectors'],
      amenitySubsectorsValues
    )

    return h.view('using-ppps/amenity-subsector/index', {
      values: { amenitySubsectors: selected, amenitySubsectorsOther: other }
    })
  }
}

export const post = {
  handler(request, h) {
    const sectors = request.payload['amenitySubsectors']
    const other = request.payload['amenitySubsectorsOther']
    const formSession = getSession(request, 'formSession')

    setUsingPPPsAnswer(formSession, 'amenitySubsectors', sectors ?? [other])
    request.yar.set('formSession', formSession)

    return redirectToNextPage(request, h, getNextPage(AMENITY_SUBSECTOR_PAGE, formSession))
  }
}
