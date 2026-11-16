import { getSession } from '#/server/common/helpers/get-session.js'

// Shows the contact email the verification link was sent to. It saves nothing,
// so without a contact email there's nothing to show and it's back to the contact.
export const get = {
  handler(request, h) {
    const contactEmail = getSession(request, 'formSession')['primaryContact']?.['contactEmail']

    if (!contactEmail) {
      return h.redirect('/business-contact')
    }

    return h.view('qualifying-questions/verify-email/index', { contactEmail })
  }
}
