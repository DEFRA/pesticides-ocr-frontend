import { getSession } from '#/server/common/helpers/get-session.js'
import { splitOtherAnswer } from '#/server/common/helpers/split-other-answer.js'
import { redirectToNextPage } from '#/server/common/helpers/journey-navigation.js'
import { getNextPage, USING_MEMBER_SCHEMES_PAGE } from '#/server/common/helpers/journey.js'
import {
  getUsingPPPsAnswers,
  setUsingPPPsAnswer
} from '#/server/common/helpers/using-ppps-answers.js'
import { memberSchemesValues } from './items.js'

// The answer is the chosen scheme values, a single-item list holding the Other
// text, or an empty list when the optional question is skipped.
export const get = {
  handler(request, h) {
    request.yar.set('formSession', getSession(request, 'formSession'))

    const { selected, other } = splitOtherAnswer(
      getUsingPPPsAnswers(getSession(request, 'formSession'))['memberSchemes'],
      memberSchemesValues
    )

    return h.view('using-ppps/member-schemes/index', {
      values: { memberSchemes: selected, memberSchemesOther: other }
    })
  }
}

export const post = {
  handler(request, h) {
    const schemes = request.payload['memberSchemes']
    const other = request.payload['memberSchemesOther']
    const formSession = getSession(request, 'formSession')

    setUsingPPPsAnswer(formSession, 'memberSchemes', schemes ?? (other ? [other] : []))
    request.yar.set('formSession', formSession)

    return redirectToNextPage(request, h, getNextPage(USING_MEMBER_SCHEMES_PAGE, formSession))
  }
}
