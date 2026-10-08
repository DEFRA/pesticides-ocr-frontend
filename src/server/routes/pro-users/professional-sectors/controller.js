import { getSession } from '#/server/common/helpers/get-session.js'
import { splitOtherAnswer } from '#/server/common/helpers/split-other-answer.js'
import { professionalSectorsValues } from './items.js'
import { redirectToNextPage } from '#/server/common/helpers/journey-navigation.js'
import { getNextPage } from '#/server/common/helpers/journey.js'

export const get = {
  handler(request, h) {
    request.yar.set('formSession', request.yar.get('formSession') ?? {})

    const { selected, other } = splitOtherAnswer(
      getSession(request, 'formSession')['professionalSectors'],
      professionalSectorsValues
    )

    return h.view('pro-users/professional-sectors/index', {
      values: { professionalSectors: selected, professionalSectorsOther: other }
    })
  }
}

export const post = {
  handler(request, h) {
    const sectors = request.payload['professionalSectors']
    const other = request.payload['professionalSectorsOther']
    const formSession = request.yar.get('formSession') ?? {}

    formSession['professionalSectors'] = sectors ?? [other]
    request.yar.set('formSession', formSession)

    return redirectToNextPage(request, h, getNextPage('/professional-sectors', formSession))
  }
}
