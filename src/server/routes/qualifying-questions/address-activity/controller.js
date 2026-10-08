import { getSession } from '#/server/common/helpers/get-session.js'
import { redirectToNextPage } from '#/server/common/helpers/journey-navigation.js'
import { getNextPage } from '#/server/common/helpers/journey.js'

export const get = {
  handler(request, h) {
    request.yar.set('formSession', request.yar.get('formSession') ?? {})

    const formSession = getSession(request, 'formSession')
    const currentAddressLineOne = formSession['address']?.['addressLine1']

    return h.view('qualifying-questions/address-activity/index', {
      currentAddressLineOne,
      values: { addressActivities: formSession['addressActivities'] }
    })
  }
}

export const post = {
  handler(request, h) {
    const payload = request.payload['addressActivities']
    const formSession = getSession(request, 'formSession')

    formSession['addressActivities'] = payload
    request.yar.set('formSession', formSession)

    return redirectToNextPage(request, h, getNextPage('/address-activity', formSession))
  }
}
