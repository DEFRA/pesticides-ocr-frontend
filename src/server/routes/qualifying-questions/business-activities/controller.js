import { getSession } from '#/server/common/helpers/get-session.js'
import {
  recordJourneyStart,
  recordOncePerSession
} from '#/server/common/helpers/journey-beacon.js'

export const get = {
  handler(request, h) {
    request.yar.set('formSession', request.yar.get('formSession') ?? {})

    // Record the journey start once per session (consent-free, EQ-472) — this is
    // the first page after the "Start now" button.
    recordOncePerSession(request, {
      sessionKey: 'journeyStarted',
      record: recordJourneyStart,
      logMessage: 'Journey start recorded for this session (EQ-472)'
    })

    return h.view('qualifying-questions/business-activities/business-activities')
  }
}

export const post = {
  handler(request, h) {
    const payload = request.payload['businessActivities']
    const formSession = getSession(request, 'formSession')

    formSession['businessActivities'] = payload
    request.yar.set('formSession', formSession)

    if (payload.includes('seller-amateur')) {
      return h.redirect('/business-name')
    }

    return h.redirect('/main-customer')
  }
}
