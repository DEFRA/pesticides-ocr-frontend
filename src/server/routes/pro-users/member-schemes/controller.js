import { getSession } from '#/server/common/helpers/get-session.js'
import { splitOtherAnswer } from '#/server/common/helpers/split-other-answer.js'
import { memberSchemesValues } from './items.js'
import { redirectToNextPage } from '#/server/common/helpers/journey-navigation.js'
import { getNextPage } from '#/server/common/helpers/journey.js'

export const get = {
  handler(request, h) {
    request.yar.set('formSession', request.yar.get('formSession') ?? {})

    const { selected, other } = splitOtherAnswer(
      getSession(request, 'formSession')['memberSchemes'],
      memberSchemesValues
    )

    return h.view('pro-users/member-schemes/index', {
      values: { memberSchemes: selected, memberSchemesOther: other }
    })
  }
}

export const post = {
  handler(request, h) {
    const schemes = request.payload['memberSchemes']
    const other = request.payload['memberSchemesOther']
    const formSession = getSession(request, 'formSession')

    formSession['memberSchemes'] = schemes ?? [other]
    request.yar.set('formSession', formSession)

    return redirectToNextPage(request, h, getNextPage('/member-schemes', formSession))
  }
}
