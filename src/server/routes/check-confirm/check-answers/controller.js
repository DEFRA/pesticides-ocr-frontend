import { buildAnswers } from './helpers/build-answers.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import Boom from '@hapi/boom'
import { config } from '#/config/config.js'
import { getSession } from '#/server/common/helpers/get-session.js'
import { CHECK_ANSWERS_PAGE, isOnRoute } from '#/server/common/helpers/journey.js'
import { setReturnUrl } from '#/server/common/helpers/journey-navigation.js'

const ADD_ADDRESS_PAGE = '/additional-addresses/address'

export const get = {
  handler(request, h) {
    const formData = request.yar.get('formSession') ?? {}

    setReturnUrl(request, ADD_ADDRESS_PAGE, CHECK_ANSWERS_PAGE)

    return h.view('check-confirm/check-answers/index', {
      answers: buildAnswers(formData),
      canAddAdditionalAddresses: isOnRoute('/additional-addresses', formData)
    })
  }
}

export const deleteAdditionalAddress = {
  handler(request, h) {
    const formSession = getSession(request, 'formSession')
    const additionalAddresses = formSession['additionalAddresses'] ?? []
    const index = request.params.number - 1

    if (index >= additionalAddresses.length) {
      return Boom.notFound('Additional address not found')
    }

    additionalAddresses.splice(index, 1)
    formSession['additionalAddresses'] = additionalAddresses
    request.yar.set('formSession', formSession)

    return h.redirect(CHECK_ANSWERS_PAGE)
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
