import { CHECK_YOUR_EMAIL_PAGE } from '#/server/common/helpers/email-verification.js'
import { RESEND_PATH } from '../check-your-email/controller.js'

const GO_BACK = 'Go back to the browser where you started to continue.'

// `auto: true` lets the progressive-enhancement script chain straight into
// this step once the applicant's Confirm click has already resolved
// (same-browser case only), instead of making them click Continue as well.
// The non-JS fallback still renders this as a normal button and a second
// page, so nothing here changes the no-JS/D5 behaviour.
const continueJourney = { text: 'Continue', action: CHECK_YOUR_EMAIL_PAGE, auto: true }

// Only the browser that started the journey can send another link to it.
const newLink = (canRequestLink) =>
  canRequestLink
    ? { action: { text: 'Send a new link', action: RESEND_PATH } }
    : { paragraphs: ['Go back to the browser where you started to request a new link.'] }

const confirmed = (heading, paragraph) => ({ continueHere }) => ({
  heading,
  paragraphs: [paragraph, ...(continueHere ? [] : [GO_BACK])],
  ...(continueHere && { action: continueJourney })
})

const unusable = (heading, paragraph) => ({ canRequestLink }) => {
  const { paragraphs = [], action } = newLink(canRequestLink)
  return { heading, paragraphs: [paragraph, ...paragraphs], action }
}

// The applicant messages from the design (§7.3), by the backend's outcome code.
const OUTCOMES = {
  VERIFIED: confirmed('Email address confirmed', 'Your email address has been confirmed.'),
  TOKEN_ALREADY_USED: confirmed(
    'Email address already confirmed',
    'This email address has already been confirmed.'
  ),
  TOKEN_EXPIRED: unusable('This link has expired', 'Links work for 15 minutes.'),
  TOKEN_INVALID: unusable(
    'This link is not valid',
    'Check you used the full link from the most recent email, or request a new one.'
  ),
  TOKEN_SUPERSEDED: () => ({
    heading: 'This link has been replaced by a newer one',
    paragraphs: ['Use the link in the most recent email we sent you.']
  })
}

export const INVALID_LINK = { code: 'TOKEN_INVALID' }

export function outcomePage(code, browser) {
  const page = (OUTCOMES[code] ?? OUTCOMES[INVALID_LINK.code])(browser)
  return { pageTitle: page.heading, ...page }
}
