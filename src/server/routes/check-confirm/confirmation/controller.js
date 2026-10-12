import Boom from '@hapi/boom'
import { analyticsEvents } from '#/server/common/constants/analytics-events.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'

export const get = {
  handler(request, h) {
    let reference
    const formSession = request.yar.get('formSession') ?? {}

    if (formSession['confirmation-reference']) {
      reference = formSession['confirmation-reference']
    } else {
      return Boom.badData(new Error('Confirmation reference not found in session data'), {
        statusCode: statusCodes.badData
      })
    }

    // Once per saved registration, so a reload doesn't send it again.
    const isNewRegistration =
      request.yar.get('registrationCompleteTracked') !== reference
    request.yar.set('registrationCompleteTracked', reference)

    return h.view('check-confirm/confirmation/index', {
      reference,
      analyticsEvent: isNewRegistration
        ? analyticsEvents.registrationComplete
        : undefined
    })
  }
}
