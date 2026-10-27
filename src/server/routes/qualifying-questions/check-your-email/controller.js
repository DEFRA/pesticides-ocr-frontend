import { getSession } from '#/server/common/helpers/get-session.js'
import { nextPageUrl, redirectToNextPage, withChangeMode } from '#/server/common/helpers/journey-navigation.js'
import { getNextPage } from '#/server/common/helpers/journey.js'
import { backendError } from '#/server/common/helpers/ocr-backend-client.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import {
  getCurrentEmailVerification,
  requestEmailVerification
} from '#/server/common/helpers/email-verification-client.js'
import {
  CHECK_YOUR_EMAIL_PAGE,
  EMAIL_PAGE,
  contactEmail,
  getEmailVerification,
  isEmailVerified,
  isVerificationFor,
  markEmailVerified,
  minutesUntil,
  startEmailVerification,
  verificationErrorMessage
} from '#/server/common/helpers/email-verification.js'

const VIEW = 'qualifying-questions/check-your-email/index'
export const RESEND_PATH = `${CHECK_YOUR_EMAIL_PAGE}/resend`
const RESENT_FLASH = 'emailVerificationResent'

const LINK_NOT_USED = {
  pending: { message: 'Confirm your email address using the link in the email we sent you' },
  expired: { message: 'The link has expired. Request another email to get a new link.', linkExpired: true },
  none: { message: 'Request another email to get a link to confirm your email address', linkExpired: true }
}

const hasVerificationForContact = (request) => isVerificationFor(request, contactEmail(request))

// True for the progressive-enhancement script's auto-chained request (see
// verify-email's outcomes.js `auto: true`), so the response can give back a
// URL to follow instead of a redirect the fetch call would otherwise need
// to replay manually.
const wantsJson = (request) => (request.headers.accept || '').includes('application/json')

function render(request, h, { message, linkExpired = false } = {}) {
  const expiryMinutes = minutesUntil(getEmailVerification(request).expiresAt)
  const page = {
    email: contactEmail(request),
    expiryMinutes,
    linkExpired: linkExpired || expiryMinutes <= 0,
    resent: request.yar.flash(RESENT_FLASH).length > 0,
    changeHref: withChangeMode(request, EMAIL_PAGE),
    continueAction: withChangeMode(request, CHECK_YOUR_EMAIL_PAGE),
    resendAction: withChangeMode(request, RESEND_PATH),
    ...(message && { errorList: [{ text: message }] })
  }

  return wantsJson(request) ? page : h.view(VIEW, page)
}

const backToEmailPage = (request, h) => {
  const url = withChangeMode(request, EMAIL_PAGE)
  return wantsJson(request) ? { redirectTo: url } : h.redirect(url)
}

export const get = {
  handler(request, h) {
    if (!hasVerificationForContact(request)) {
      return backToEmailPage(request, h)
    }
    return render(request, h)
  }
}

// "Continue" picks up a link that was opened on another device or browser.
export const post = {
  async handler(request, h) {
    if (!hasVerificationForContact(request)) {
      return backToEmailPage(request, h)
    }

    if (!isEmailVerified(request)) {
      const { status } = await getCurrentEmailVerification(request)

      if (status !== 'verified') {
        if (!LINK_NOT_USED[status]) {
          throw backendError(statusCodes.badGateway, `OCR backend returned an unknown email verification status: ${status}`)
        }
        return render(request, h, LINK_NOT_USED[status])
      }
      markEmailVerified(request)
    }

    const nextPage = getNextPage(EMAIL_PAGE, getSession(request, 'formSession'))

    if (wantsJson(request)) {
      return { redirectTo: nextPageUrl(request, nextPage) }
    }
    return redirectToNextPage(request, h, nextPage)
  }
}

export const resend = {
  async handler(request, h) {
    if (!hasVerificationForContact(request)) {
      return backToEmailPage(request, h)
    }

    const email = contactEmail(request)
    const result = await requestEmailVerification(request, email)

    if (result.error) {
      return render(request, h, { message: verificationErrorMessage(result.error) })
    }

    startEmailVerification(request, email, result)
    request.yar.flash(RESENT_FLASH, true)
    return h.redirect(withChangeMode(request, CHECK_YOUR_EMAIL_PAGE))
  }
}
