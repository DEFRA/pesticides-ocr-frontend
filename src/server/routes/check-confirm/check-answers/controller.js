import { buildAnswers } from './helpers/build-answers.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import Boom from '@hapi/boom'
import { config } from '#/config/config.js'
import { getSession } from '#/server/common/helpers/get-session.js'
import { CHECK_ANSWERS_PAGE, findFirstMissingPage, isOnRoute } from '#/server/common/helpers/journey.js'
import { removeUnfinishedAddresses } from '#/server/common/helpers/additional-addresses.js'
import { getJourneyToken, TOKEN_HEADER } from '#/server/common/helpers/journey-beacon.js'
import { backendError, errorBody } from '#/server/common/helpers/ocr-backend-client.js'
import {
  EMAIL_NOT_VERIFIED_FLASH,
  EMAIL_PAGE,
  clearEmailVerification
} from '#/server/common/helpers/email-verification.js'

export const get = {
  handler(request, h) {
    const formData = removeUnfinishedAddresses(request.yar.get('formSession') ?? {})
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
    const formSession = removeUnfinishedAddresses(request.yar.get('formSession') ?? {})
    const missingPage = findFirstMissingPage(formSession)

    if (missingPage !== CHECK_ANSWERS_PAGE) {
      return h.redirect(`${missingPage}?change=true`)
    }

    // The backend only registers an email address verified on this journey, and
    // fails closed without the token, so don't send a doomed request.
    const journeyToken = getJourneyToken(request)
    if (!journeyToken) {
      throw backendError(
        statusCodes.serviceUnavailable,
        'Registration needs JOURNEY_TOKEN_SECRET, which is not configured'
      )
    }

    const url = `${config.get('ocrBackend.url')}/register`
    const postOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        [TOKEN_HEADER]: journeyToken
      },
      body: JSON.stringify(formSession)
    }

    let response
    try {
      response = await fetch(url, postOptions)
    } catch (error) {
      return Boom.internal(`Failed to submit form data: ${error.message}`)
    }

    if (response.status === statusCodes.forbidden) {
      const { code } = await errorBody(response)

      // The verification is too old for the backend, or was for another
      // address, so the address is confirmed again. The other answers are kept.
      if (code === 'EMAIL_NOT_VERIFIED') {
        clearEmailVerification(request)
        request.yar.flash(EMAIL_NOT_VERIFIED_FLASH, true)
        return h.redirect(`${EMAIL_PAGE}?change=true`)
      }
    }

    // A rejected journey token means the two services disagree on the secret,
    // which the applicant can't fix, so it is a server error.
    if (response.status === statusCodes.unauthorized) {
      const { code } = await errorBody(response)
      throw backendError(
        statusCodes.badGateway,
        `OCR backend registration returned ${response.status}${code ? ` ${code}` : ''}`
      )
    }

    if (response.status === statusCodes.serviceUnavailable) {
      throw backendError(statusCodes.serviceUnavailable, 'OCR backend registration returned 503')
    }

    if (response.status !== statusCodes.created) {
      return Boom.boomify(new Error(`Failed to submit form data: ${response.statusText}`), {
        statusCode: response.status
      })
    }

    const responseData = await response.json()
    request.yar.set('formSession', {})
    request.yar.set('confirmationReference', responseData.reference)

    return h.redirect('/confirmation')
  }
}
