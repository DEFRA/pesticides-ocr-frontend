import { buildAnswers } from './helpers/build-answers.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import Boom from '@hapi/boom'

export const get = {
  handler(request, h) {
    const formData = request.yar.get('formSession') ?? {}

    return h.view('check-confirm/check-answers/check-answers', {
      answers: buildAnswers(formData)
    })
  }
}

export const post = {
  async handler(request, h) {
    const formSession = request.yar.get('formSession') ?? {}

    const url = 'http://localhost:3001/register'
    const postOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formSession)
    }

    const response = await fetch(url, postOptions)

    if (response.status === statusCodes.badRequest) {
      return Boom.badRequest(`Failed to submit form data: ${response.statusText}`)
    }

    if (response.status === statusCodes.created) {
      const responseData = await response.json()
      formSession['confirmation-reference'] = responseData.reference

      request.yar.set('formSession', formSession)
    }

    return h.redirect('/confirmation')
  }
}
