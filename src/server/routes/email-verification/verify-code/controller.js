import { statusCodes } from '#/server/common/constants/status-codes.js'
import { buildErrorSummary } from '#/client/common/helpers/build-error-summary.js'
import {
  backendError,
  confirmEmailVerification,
  resendEmailVerification
} from '../email-verification-client.js'
import {
  clearEmailVerification,
  emailVerificationPaths,
  getEmailVerification,
  minutesUntil,
  secondsUntil,
  setEmailVerification,
  verificationFromBackend
} from '../email-verification-session.js'

export const view = 'email-verification/verify-code/verify-code'

const codeResentFlash = 'emailCodeResent'

export function buildCodeViewContext(request) {
  const verification = getEmailVerification(request)

  return {
    email: verification?.email,
    codeLength: verification?.codeLength,
    minutesUntilExpiry: minutesUntil(verification?.expiresAt)
  }
}

function renderError(request, h, field, message) {
  return h.view(view, {
    ...buildCodeViewContext(request),
    values: request.payload,
    ...buildErrorSummary([{ path: [field], message }])
  })
}

function unexpectedResponse(action, status) {
  return backendError(
    statusCodes.badGateway,
    `OCR backend POST /email-verifications/{id}/${action} returned ${status}`
  )
}

function plural(count, word) {
  return `${count} ${word}${count === 1 ? '' : 's'}`
}

function confirmErrorMessage(status, body) {
  if (status === statusCodes.badRequest) {
    // The backend answers a wrong code and an expired code with the same 400;
    // only a wrong code carries remainingAttempts.
    if (!Number.isInteger(body.remainingAttempts)) {
      return 'The code has expired. Request a new code.'
    }
    return body.remainingAttempts > 0
      ? `The code is incorrect. You have ${plural(body.remainingAttempts, 'attempt')} left.`
      : 'The code is incorrect. Request a new code.'
  }
  if (status === statusCodes.tooManyRequests) {
    return 'You have entered an incorrect code too many times. Request a new code.'
  }
  return undefined
}

function resendErrorMessage(status, body) {
  if (status === statusCodes.tooManyRequests) {
    return body.retryAfter
      ? `Wait ${plural(secondsUntil(body.retryAfter), 'second')} before asking for a new code.`
      : 'You have asked for too many codes. Try again later.'
  }
  if (status === statusCodes.badGateway) {
    return 'We could not send a new code. Try again.'
  }
  return undefined
}

// Sends the user back to the right place when there is no verification in
// progress: to the email page if none was started, or on into the journey if
// it has already succeeded. Returns undefined when the page should proceed.
function redirectIfNotPending(verification, h) {
  if (!verification) {
    return h.redirect(emailVerificationPaths.email)
  }
  if (verification.verified) {
    return h.redirect(emailVerificationPaths.next)
  }
  return undefined
}

function markVerified(request, verification) {
  setEmailVerification(request, { ...verification, verified: true })
  request.logger.info('Email address verified for this session (FE-445)')
}

// The backend deletes verification records after a retention period, so the
// only way forward is to start again.
function restart(request, h) {
  clearEmailVerification(request)
  return h.redirect(emailVerificationPaths.email)
}

export const get = {
  handler(request, h) {
    const verification = getEmailVerification(request)
    const redirect = redirectIfNotPending(verification, h)
    if (redirect) {
      return redirect
    }

    return h.view(view, {
      ...buildCodeViewContext(request),
      codeResent: request.yar.flash(codeResentFlash).length > 0
    })
  }
}

export const post = {
  async handler(request, h) {
    const verification = getEmailVerification(request)
    const redirect = redirectIfNotPending(verification, h)
    if (redirect) {
      return redirect
    }

    const { code } = request.payload
    if (code.length !== verification.codeLength) {
      return renderError(
        request,
        h,
        'code',
        `The code must be ${verification.codeLength} digits`
      )
    }

    const { status, body } = await confirmEmailVerification(
      verification.verificationId,
      code
    )

    if (status === statusCodes.ok) {
      markVerified(request, verification)
      return h.redirect(emailVerificationPaths.next)
    }
    if (status === statusCodes.notFound) {
      return restart(request, h)
    }

    const message = confirmErrorMessage(status, body)
    if (!message) {
      throw unexpectedResponse('confirm', status)
    }

    request.logger.warn(`Email verification code rejected: ${status}`)
    return renderError(request, h, 'code', message)
  }
}

export const resend = {
  async handler(request, h) {
    const verification = getEmailVerification(request)
    const redirect = redirectIfNotPending(verification, h)
    if (redirect) {
      return redirect
    }

    const { status, body } = await resendEmailVerification(
      verification.verificationId
    )

    if (status === statusCodes.created) {
      setEmailVerification(request, verificationFromBackend(body))
      request.yar.flash(codeResentFlash, true)
      request.logger.info('Email verification code resent (FE-445)')
      return h.redirect(emailVerificationPaths.code)
    }
    if (status === statusCodes.conflict) {
      markVerified(request, verification)
      return h.redirect(emailVerificationPaths.next)
    }
    if (status === statusCodes.notFound) {
      return restart(request, h)
    }

    const message = resendErrorMessage(status, body)
    if (!message) {
      throw unexpectedResponse('resend', status)
    }

    request.logger.warn(`Email verification code could not be resent: ${status}`)
    return renderError(request, h, 'resend', message)
  }
}
