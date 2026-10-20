import { buildAnswers } from './helpers/build-answers.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import Boom from '@hapi/boom'
import { config } from '#/config/config.js'
import { getSession } from '#/server/common/helpers/get-session.js'
import { CHECK_ANSWERS_PAGE, findFirstMissingPage, isOnRoute } from '#/server/common/helpers/journey.js'
import { removeUnfinishedAddresses } from '#/server/common/helpers/additional-addresses.js'
import { ADDRESS_SEARCH_KEY } from '#/server/common/constants/session-keys.js'

export const get = {
  handler(request, h) {
    const formData = removeUnfinishedAddresses(getSession(request, 'formSession'))
    request.yar.set('formSession', formData)

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
    const formSession = removeUnfinishedAddresses(getSession(request, 'formSession'))
    const missingPage = findFirstMissingPage(formSession)

    if (missingPage !== CHECK_ANSWERS_PAGE) {
      return h.redirect(`${missingPage}?change=true`)
    }

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
    request.yar.set('formSession', {})
    request.yar.clear(ADDRESS_SEARCH_KEY)
    request.yar.set('confirmationReference', responseData.reference)

    return h.redirect('/confirmation')
  }
}
