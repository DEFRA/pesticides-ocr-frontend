import Boom from '@hapi/boom'
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

    return h.view('check-confirm/confirmation/confirmation', {
      reference
    })
  }
}
