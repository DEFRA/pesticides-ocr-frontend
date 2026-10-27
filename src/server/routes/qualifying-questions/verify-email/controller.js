import { verifyEmailToken } from '#/server/common/helpers/email-verification-client.js'
import {
  VERIFY_EMAIL_PAGE,
  contactEmail,
  isVerificationFor,
  markEmailVerified
} from '#/server/common/helpers/email-verification.js'
import { INVALID_LINK, outcomePage } from './outcomes.js'

const VIEW = 'qualifying-questions/verify-email/index'
const TOKEN_KEY = 'emailVerificationLinkToken'
const OUTCOME_KEY = 'emailVerificationLinkOutcome'

// `ajax: true` tells the template to let the client-side script intercept
// this one form, so a real user's click resolves in place on this page
// instead of a second page/template (still a POST, still gated on the click).
const CONFIRM_PAGE = {
  heading: 'Confirm your email address',
  paragraphs: ['Select the button to confirm this is your email address.'],
  action: { text: 'Confirm email address', action: VERIFY_EMAIL_PAGE, ajax: true }
}

const CONFIRMED_CODES = new Set(['VERIFIED', 'TOKEN_ALREADY_USED'])

// True when the client-side script asked for the result as JSON, so it can
// swap it into the current page instead of following a redirect/reload.
const wantsJson = (request) => (request.headers.accept || '').includes('application/json')

// This browser started the journey if it holds the link that was sent.
function buildOutcomeView(request) {
  const canRequestLink = isVerificationFor(request, contactEmail(request))
  const { code, sameJourney } = request.yar.get(OUTCOME_KEY) ?? INVALID_LINK

  return outcomePage(code, { canRequestLink, continueHere: sameJourney && canRequestLink })
}

// Opening the link never uses it up, because email scanners open links too.
// The token moves into the session and out of the address bar, and only the
// Confirm button sends it to the backend.
export const get = {
  handler(request, h) {
    if ('token' in request.query) {
      const { token } = request.query
      if (typeof token === 'string' && token) {
        request.yar.set(TOKEN_KEY, token)
      } else {
        request.yar.clear(TOKEN_KEY)
      }
      request.yar.clear(OUTCOME_KEY)
      return h.redirect(VERIFY_EMAIL_PAGE)
    }

    if (request.yar.get(TOKEN_KEY)) {
      return h.view(VIEW, CONFIRM_PAGE)
    }

    return h.view(VIEW, buildOutcomeView(request))
  }
}

// The outcome is kept in the session and shown by the GET, so refreshing the
// page doesn't post the used token again. When the request asks for JSON
// (the progressive-enhancement script), the same content is returned
// directly instead of via a redirect, so it can be swapped into the page
// the applicant is already on.
export const post = {
  async handler(request, h) {
    const token = request.yar.get(TOKEN_KEY)
    if (!token) {
      return wantsJson(request) ? buildOutcomeView(request) : h.redirect(VERIFY_EMAIL_PAGE)
    }

    let result
    try {
      result = await verifyEmailToken(request, token)
    } finally {
      request.yar.clear(TOKEN_KEY)
    }

    const { code, sameJourney } = result.error ?? { code: 'VERIFIED', sameJourney: result.sameJourney }
    const continueHere = sameJourney && isVerificationFor(request, contactEmail(request))

    if (continueHere && CONFIRMED_CODES.has(code)) {
      markEmailVerified(request)
    }

    request.yar.set(OUTCOME_KEY, { code, sameJourney })

    return wantsJson(request) ? buildOutcomeView(request) : h.redirect(VERIFY_EMAIL_PAGE)
  }
}
