import { getSession } from '#/server/common/helpers/get-session.js'
import { CHECK_ANSWERS_PAGE } from '#/server/common/helpers/journey.js'

// Shows the contact email to be verified. It saves nothing, so without a
// contact email there's nothing to show and it's back to the contact.
export const get = {
  handler(request, h) {
    const contactEmail = getSession(request, 'formSession')['primaryContact']?.['contactEmail']

    if (!contactEmail) {
      return h.redirect('/business-contact')
    }

    // From check answers (?change=true), carrying on goes back there.
    const continueLink = request.query?.change === 'true' ? CHECK_ANSWERS_PAGE : '/business-name'

    return h.view('qualifying-questions/verify-email/index', { contactEmail, continueLink })
  }
}
