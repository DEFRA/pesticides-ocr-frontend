import { getSession } from '#/server/common/helpers/get-session.js'
import { redirectToNextPage, withChangeMode } from '#/server/common/helpers/journey-navigation.js'
import { getNextPage } from '#/server/common/helpers/journey.js'
import { buildErrorSummary } from '#/server/common/helpers/build-error-summary.js'
import { requestEmailVerification } from '#/server/common/helpers/email-verification-client.js'
import { analyticsEvents } from '#/server/common/constants/analytics-events.js'
import {
  recordJourneyStart,
  recordOncePerSession
} from '#/server/common/helpers/journey-beacon.js'
import {
  CHECK_YOUR_EMAIL_PAGE,
  EMAIL_NOT_VERIFIED_FLASH,
  EMAIL_NOT_VERIFIED_MESSAGE,
  clearEmailVerification,
  hasUnexpiredLink,
  isEmailVerified,
  isVerificationFor,
  startEmailVerification,
  verificationErrorMessage
} from '#/server/common/helpers/email-verification.js'

export const get = {
  handler(request, h) {
    request.yar.set('formSession', request.yar.get('formSession') ?? {})

    // Record the journey start once per session (consent-free, EQ-472) — this is
    // the first page after the "What would you like to do?" choice.
    const started = recordOncePerSession(request, {
      sessionKey: 'journeyStarted',
      record: recordJourneyStart,
      logMessage: 'Journey start recorded for this session (EQ-472)'
    })

    return h.view('qualifying-questions/business-contact/index', {
      values: getSession(request, 'formSession')['primaryContact'],
      analyticsEvent: started ? analyticsEvents.journeyStart : undefined,
      ...(request.yar.flash(EMAIL_NOT_VERIFIED_FLASH).length > 0 && {
        emailNotVerifiedMessage: EMAIL_NOT_VERIFIED_MESSAGE
      })
    })
  }
}

export const post = {
  async handler(request, h) {
    const payload = request.payload
    const formSession = request.yar.get('formSession') ?? {}

    formSession['primaryContact'] = payload
    request.yar.set('formSession', formSession)

    if (!isVerificationFor(request, payload.contactEmail)) {
      clearEmailVerification(request)
    }

    if (isEmailVerified(request)) {
      return redirectToNextPage(request, h, getNextPage('/business-contact', formSession))
    }

    // Coming back without changing the address keeps the link already sent.
    if (!hasUnexpiredLink(request)) {
      const result = await requestEmailVerification(request, payload.contactEmail)

      if (result.error) {
        const message = verificationErrorMessage(result.error)
        return h.view('qualifying-questions/business-contact/index', {
          values: payload,
          ...buildErrorSummary([{ path: ['contactEmail'], message }])
        })
      }
      startEmailVerification(request, payload.contactEmail, result)
    }

    return h.redirect(withChangeMode(request, CHECK_YOUR_EMAIL_PAGE))
  }
}
