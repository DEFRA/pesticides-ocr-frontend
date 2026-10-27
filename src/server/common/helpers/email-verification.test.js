import {
  needsVerifiedEmail,
  normaliseEmail,
  verificationErrorMessage
} from './email-verification.js'

describe('#emailVerification', () => {
  test('Should compare email addresses trimmed and lower-cased, like the backend', () => {
    expect(normaliseEmail('  Jo.Bloggs@Example.COM ')).toBe('jo.bloggs@example.com')
  })

  test.each([
    [{ code: 'VALIDATION_ERROR' }, 'Enter an email address in the correct format, like name@example.com'],
    [{ code: 'RESEND_COOLDOWN', retryAfterSeconds: 42 }, 'Wait 42 seconds before requesting another email'],
    [{ code: 'RESEND_COOLDOWN', retryAfterSeconds: 1 }, 'Wait 1 second before requesting another email'],
    [{ code: 'RESEND_COOLDOWN' }, 'Wait a minute before requesting another email'],
    [{ code: 'RATE_LIMITED', retryAfterSeconds: 1790 }, 'You have requested too many emails. Try again in 30 minutes.'],
    [{ code: 'RATE_LIMITED', retryAfterSeconds: 30 }, 'You have requested too many emails. Try again in 1 minute.'],
    [{ code: 'RATE_LIMITED' }, 'You have requested too many emails. Try again later.'],
    [{ code: 'EMAIL_SEND_FAILED' }, 'We could not send the email. Check the address is correct and try again.']
  ])('Should describe %o to the applicant', (error, message) => {
    expect(verificationErrorMessage(error)).toBe(message)
  })

  test.each([
    '/business-name',
    '/business-address',
    '/business-activities',
    '/main-customer',
    '/address-activity',
    '/quantity',
    '/professional-sectors',
    '/member-schemes',
    '/additional-addresses',
    '/additional-addresses/contact',
    '/check-additional-address',
    '/check-answers',
    '/check-answers/additional-addresses/1/delete'
  ])('Should need a verified email for %s', (path) => {
    expect(needsVerifiedEmail(path)).toBe(true)
  })

  test.each([
    '/',
    '/register-choice',
    '/business-contact',
    '/check-your-email',
    '/confirmation',
    '/quantity-other'
  ])('Should not need a verified email for %s', (path) => {
    expect(needsVerifiedEmail(path)).toBe(false)
  })
})
