import { getSession } from './get-session.js'
import { CHECK_ANSWERS_PAGE, JOURNEY } from './journey.js'

// Kept out of formSession, which is what gets posted to /register.
const SESSION_KEY = 'emailVerification'

export const EMAIL_PAGE = '/business-contact'
export const CHECK_YOUR_EMAIL_PAGE = '/check-your-email'
export const VERIFY_EMAIL_PAGE = '/verify-email'

// Set when /register says the address is no longer verified, so the email
// page can say why the applicant is back there.
export const EMAIL_NOT_VERIFIED_FLASH = 'emailNotVerified'
export const EMAIL_NOT_VERIFIED_MESSAGE =
  'You need to confirm your email address again before you submit your registration. Check it is correct, then select Continue to get a new email.'

const MS_PER_SECOND = 1000
const SECONDS_PER_MINUTE = 60

// The backend trims and lower-cases addresses, so compare them the same way.
export const normaliseEmail = (email = '') => email.trim().toLowerCase()

export const contactEmail = (request) =>
  getSession(request, 'formSession').primaryContact?.contactEmail

export const getEmailVerification = (request) => request.yar.get(SESSION_KEY)

export function startEmailVerification(request, email, { expiresAt, resendAvailableAt }) {
  request.yar.set(SESSION_KEY, {
    email: normaliseEmail(email),
    expiresAt,
    resendAvailableAt,
    verified: false
  })
}

export function markEmailVerified(request) {
  request.yar.set(SESSION_KEY, { ...getEmailVerification(request), verified: true })
}

export function clearEmailVerification(request) {
  request.yar.clear(SESSION_KEY)
}

export function isVerificationFor(request, email) {
  const verification = getEmailVerification(request)
  return Boolean(email) && verification?.email === normaliseEmail(email)
}

export const isEmailVerified = (request) =>
  isVerificationFor(request, contactEmail(request)) && getEmailVerification(request).verified

export function hasUnexpiredLink(request) {
  const verification = getEmailVerification(request)
  return isVerificationFor(request, contactEmail(request)) && Date.parse(verification.expiresAt) > Date.now()
}

const plural = (count, unit) => `${count} ${unit}${count === 1 ? '' : 's'}`

const ERROR_MESSAGES = {
  VALIDATION_ERROR: () => 'Enter an email address in the correct format, like name@example.com',
  RESEND_COOLDOWN: (seconds) =>
    seconds > 0
      ? `Wait ${plural(seconds, 'second')} before requesting another email`
      : 'Wait a minute before requesting another email',
  RATE_LIMITED: (seconds) =>
    seconds > 0
      ? `You have requested too many emails. Try again in ${plural(Math.ceil(seconds / SECONDS_PER_MINUTE), 'minute')}.`
      : 'You have requested too many emails. Try again later.',
  EMAIL_SEND_FAILED: () => 'We could not send the email. Check the address is correct and try again.'
}

export const verificationErrorMessage = ({ code, retryAfterSeconds }) =>
  ERROR_MESSAGES[code](retryAfterSeconds)

export const minutesUntil = (isoDate) =>
  Math.ceil((Date.parse(isoDate) - Date.now()) / (MS_PER_SECOND * SECONDS_PER_MINUTE))

// Every page after the email question, including the additional address loop
// and check answers, needs the address confirmed first.
const journeyPages = Object.keys(JOURNEY)
const PAGES_AFTER_EMAIL = [
  ...journeyPages.slice(journeyPages.indexOf(EMAIL_PAGE) + 1),
  '/check-additional-address',
  CHECK_ANSWERS_PAGE
]

export const needsVerifiedEmail = (path = '') =>
  PAGES_AFTER_EMAIL.some((page) => path === page || path.startsWith(`${page}/`))

// Sends the applicant to confirm their address first. From check answers,
// change mode brings them back there once it is confirmed.
export function requireVerifiedEmail(request, h) {
  if (!needsVerifiedEmail(request.path) || !contactEmail(request) || isEmailVerified(request)) {
    return h.continue
  }
  const changeMode = request.path.startsWith(CHECK_ANSWERS_PAGE) || request.query?.change === 'true'
  return h.redirect(changeMode ? `${CHECK_YOUR_EMAIL_PAGE}?change=true` : CHECK_YOUR_EMAIL_PAGE).takeover()
}
