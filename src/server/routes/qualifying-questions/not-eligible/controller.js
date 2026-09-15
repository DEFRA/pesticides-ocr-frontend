import {
  recordJourneyNotEligible,
  recordOncePerSession
} from '#/server/common/helpers/journey-beacon.js'

export const get = {
  handler(request, h) {
    // Record the "not-eligible" finish once per session (consent-free, EQ-472):
    // the applicant reached the "You do not need to use this service" page — a
    // valid journey completion.
    recordOncePerSession(request, {
      sessionKey: 'notEligibleRecorded',
      record: recordJourneyNotEligible,
      logMessage: 'Journey not-eligible finish recorded for this session (EQ-472)'
    })

    return h.view('qualifying-questions/not-eligible/not-eligible')
  }
}
