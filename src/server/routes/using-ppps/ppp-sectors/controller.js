import { getSession } from '#/server/common/helpers/get-session.js'
import { splitOtherAnswer } from '#/server/common/helpers/split-other-answer.js'
import { redirectToNextPage } from '#/server/common/helpers/journey-navigation.js'
import { PPP_SECTORS_PAGE, getNextPage } from '#/server/common/helpers/journey.js'
import { pppSectorsValues } from './items.js'

// The answer is either the chosen sector values or, when only Other is given,
// a single-item list holding the Other text.
export const get = {
  handler(request, h) {
    request.yar.set('formSession', getSession(request, 'formSession'))

    const { selected, other } = splitOtherAnswer(
      getSession(request, 'formSession')['professionalSectors'],
      pppSectorsValues
    )

    return h.view('using-ppps/ppp-sectors/index', {
      values: { professionalSectors: selected, professionalSectorsOther: other }
    })
  }
}

export const post = {
  handler(request, h) {
    const sectors = request.payload['professionalSectors']
    const other = request.payload['professionalSectorsOther']
    const formSession = getSession(request, 'formSession')

    formSession['professionalSectors'] = sectors ?? [other]
    request.yar.set('formSession', formSession)

    return redirectToNextPage(request, h, getNextPage(PPP_SECTORS_PAGE, formSession))
  }
}
