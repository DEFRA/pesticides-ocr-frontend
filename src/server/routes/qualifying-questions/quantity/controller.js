import { getSession } from '#/server/common/helpers/get-session.js'
import { redirectToNextPage } from '#/server/common/helpers/journey-navigation.js'
import { getNextPage } from '#/server/common/helpers/journey.js'

export const get = {
  handler(request, h) {
    request.yar.set('formSession', request.yar.get('formSession') ?? {})

    const { quantityType, quantity } = getSession(request, 'formSession')['quantity'] ?? {}

    return h.view('qualifying-questions/quantity/index', {
      values: {
        quantityType,
        quantityAmount: quantityType === 'amount' ? quantity : undefined,
        quantityArea: quantityType === 'area' ? quantity : undefined
      }
    })
  }
}

export const post = {
  handler(request, h) {
    const payload = request.payload
    const formSession = request.yar.get('formSession') ?? {}
    const quantity = payload['quantityType'] === 'amount' ? payload['quantityAmount'] : payload['quantityArea']

    formSession['quantity'] = { quantityType: payload['quantityType'], quantity }
    request.yar.set('formSession', formSession)

    return redirectToNextPage(request, h, getNextPage('/quantity', formSession))
  }
}
