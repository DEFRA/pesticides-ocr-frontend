import { getSession } from '#/server/common/helpers/get-session.js'

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

    if (payload.includes('use')) {
      return h.redirect('/quantity')
    }

    return h.redirect('/check-answers')
  }
}
