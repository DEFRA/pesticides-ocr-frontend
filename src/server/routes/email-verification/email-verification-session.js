// Email verification state for the applicant journey (FE-445). It lives under
// its own yar key rather than in formSession, because formSession is posted
// as-is to the backend /register endpoint. Being in the session also means a
// verification only counts for the current journey.

const SESSION_KEY = 'emailVerification'
const MS_PER_MINUTE = 60000
const MS_PER_SECOND = 1000

export const emailVerificationPaths = {
  email: '/email-address',
  code: '/email-address/code',
  resend: '/email-address/resend',
  // The first question of the journey, reached once the email is verified.
  next: '/business-activities'
}

export function getEmailVerification(request) {
  return request.yar.get(SESSION_KEY) ?? null
}

export function setEmailVerification(request, verification) {
  request.yar.set(SESSION_KEY, verification)
}

export function clearEmailVerification(request) {
  request.yar.clear(SESSION_KEY)
}

export function isEmailVerified(request) {
  return getEmailVerification(request)?.verified === true
}

// Keeps what the pages need from a backend start/resend response.
export function verificationFromBackend(body) {
  return {
    verificationId: body.verificationId,
    email: body.email,
    codeLength: body.codeLength,
    expiresAt: body.expiresAt,
    verified: false
  }
}

export function minutesUntil(date) {
  return Math.max(Math.ceil((new Date(date) - Date.now()) / MS_PER_MINUTE), 0)
}

export function secondsUntil(date) {
  return Math.max(Math.ceil((new Date(date) - Date.now()) / MS_PER_SECOND), 1)
}
