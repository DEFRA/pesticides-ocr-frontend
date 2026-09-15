import { recordJourneyNotEligible } from '#/server/common/helpers/journey-beacon.js'

export const get = {
  handler(request, h) {
    // Record the "not-eligible" finish once per session (consent-free, EQ-472):
    // the applicant reached the "You do not need to use this service" page — a
    // valid journey completion. Set the flag first, then fire-and-forget the
    // beacon (do not await) so a slow or failing metrics write can never delay
    // or break the page.
    if (!request.yar.get('notEligibleRecorded')) {
      request.yar.set('notEligibleRecorded', true)
      request.logger.info(
        'Journey not-eligible finish recorded for this session (EQ-472)'
      )
      recordJourneyNotEligible(request)
    }

    return h.view('qualifying-questions/not-eligible/not-eligible')
  }
}
