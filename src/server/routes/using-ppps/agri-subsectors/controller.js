import { getSession } from '#/server/common/helpers/get-session.js'
import { splitOtherAnswer } from '#/server/common/helpers/split-other-answer.js'
import { redirectToNextPage } from '#/server/common/helpers/journey-navigation.js'
import { AGRI_SUBSECTORS_PAGE, getNextPage } from '#/server/common/helpers/journey.js'
import {
  getUsingPPPsAnswers,
  setUsingPPPsAnswer
} from '#/server/common/helpers/using-ppps-answers.js'
import { agriSubsectorsValues } from './items.js'

// The answer is either the chosen agricultural sector values or, when only
// Other is given, a single-item list holding the Other text.
export const get = {
  handler(request, h) {
    request.yar.set('formSession', getSession(request, 'formSession'))

    const { selected, other } = splitOtherAnswer(
      getUsingPPPsAnswers(getSession(request, 'formSession'))['agriSubsectors'],
      agriSubsectorsValues
    )

    return h.view('using-ppps/agri-subsectors/index', {
      values: { agriSubsectors: selected, agriSubsectorsOther: other }
    })
  }
}

export const post = {
  handler(request, h) {
    const sectors = request.payload['agriSubsectors']
    const other = request.payload['agriSubsectorsOther']
    const formSession = getSession(request, 'formSession')

    setUsingPPPsAnswer(formSession, 'agriSubsectors', sectors ?? [other])
    request.yar.set('formSession', formSession)

    return redirectToNextPage(request, h, getNextPage(AGRI_SUBSECTORS_PAGE, formSession))
  }
}
