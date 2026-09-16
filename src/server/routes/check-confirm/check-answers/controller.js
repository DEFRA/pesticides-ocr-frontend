import { buildAnswers } from './helpers/build-answers.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import Boom from '@hapi/boom'
import { config } from '#/config/config.js'

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

    const url = `${config.get('ocrBackend.url')}/register`
    const postOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formSession)
    }

    let response
    try {
      response = await fetch(url, postOptions)
    } catch (error) {
      return Boom.internal(`Failed to submit form data: ${error.message}`)
    }

    if (response.status !== statusCodes.created) {
      return Boom.boomify(new Error(`Failed to submit form data: ${response.statusText}`), {
        statusCode: response.status
      })
    }

    const responseData = await response.json()
    formSession['confirmation-reference'] = responseData.reference

    request.yar.set('formSession', formSession)

    return h.redirect('/confirmation')
  }
}
