import { statusCodes } from '#/server/common/constants/status-codes.js'
import { buildErrorSummary } from '#/client/common/helpers/build-error-summary.js'
import {
  backendError,
  startEmailVerification
} from '../email-verification-client.js'
import {
  emailVerificationPaths,
  getEmailVerification,
  setEmailVerification,
  verificationFromBackend
} from '../email-verification-session.js'

const view = 'email-verification/email-address/email-address'

function startErrorMessage(status, body) {
  switch (status) {
    // The page validates the email with the same rules as the backend, so
    // this is only reached if the two drift apart.
    case statusCodes.badRequest:
      return body.message
    case statusCodes.tooManyRequests:
      return 'You have asked for too many codes for this email address. Try again later.'
    case statusCodes.badGateway:
      return 'We could not send a code to this email address. Check it is correct and try again.'
    default:
      return undefined
  }
}

export const get = {
  handler(request, h) {
    const verification = getEmailVerification(request)

    return h.view(view, { values: { email: verification?.email } })
  }
}

export const post = {
  async handler(request, h) {
    const { email } = request.payload
    const current = getEmailVerification(request)

    // Already verified in this session (e.g. the user came back to this page),
    // so there is no need to send another code.
    if (current?.verified && current.email === email.toLowerCase()) {
      return h.redirect(emailVerificationPaths.next)
    }

    const { status, body } = await startEmailVerification(email)

    if (status === statusCodes.created) {
      setEmailVerification(request, verificationFromBackend(body))
      request.logger.info('Email verification code sent (FE-445)')
      return h.redirect(emailVerificationPaths.code)
    }

    const message = startErrorMessage(status, body)
    if (!message) {
      throw backendError(
        statusCodes.badGateway,
        `OCR backend POST /email-verifications returned ${status}`
      )
    }

    request.logger.warn(`Email verification could not be started: ${status}`)
    return h.view(view, {
      values: { email },
      ...buildErrorSummary([{ path: ['email'], message }])
    })
  }
}
