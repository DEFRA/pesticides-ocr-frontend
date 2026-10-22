import { getSession } from '#/server/common/helpers/get-session.js'
import { splitOtherAnswer } from '#/server/common/helpers/split-other-answer.js'
import { redirectToNextPage } from '#/server/common/helpers/journey-navigation.js'
import { HORTI_SUBSECTOR_PAGE, getNextPage } from '#/server/common/helpers/journey.js'
import {
  getUsingPPPsAnswers,
  setUsingPPPsAnswer
} from '#/server/common/helpers/using-ppps-answers.js'
import { hortiSubsectorsValues } from './items.js'

// The answer is either the chosen horticultural sector values or, when only
// Other is given, a single-item list holding the Other text.
export const get = {
  handler(request, h) {
    request.yar.set('formSession', getSession(request, 'formSession'))

    const { selected, other } = splitOtherAnswer(
      getUsingPPPsAnswers(getSession(request, 'formSession'))['hortiSubsectors'],
      hortiSubsectorsValues
    )

    return h.view('using-ppps/horti-subsector/index', {
      values: { hortiSubsectors: selected, hortiSubsectorsOther: other }
    })
  }
}

export const post = {
  handler(request, h) {
    const sectors = request.payload['hortiSubsectors']
    const other = request.payload['hortiSubsectorsOther']
    const formSession = getSession(request, 'formSession')

    setUsingPPPsAnswer(formSession, 'hortiSubsectors', sectors ?? [other])
    request.yar.set('formSession', formSession)

    return redirectToNextPage(request, h, getNextPage(HORTI_SUBSECTOR_PAGE, formSession))
  }
}
