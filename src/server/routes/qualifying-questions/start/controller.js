import { analyticsEvents } from '#/server/common/constants/analytics-events.js'
import { REGISTRATION_CHOICE_KEY } from '#/server/common/constants/session-keys.js'
import { getSession } from '#/server/common/helpers/get-session.js'
import {
  recordJourneyStart,
  recordOncePerSession
} from '#/server/common/helpers/journey-beacon.js'
import { UPDATE_REGISTRATION } from './items.js'

const FIRST_REGISTRATION_PAGE = '/business-contact'
const UPDATE_PAGE = '/update'

export const get = {
  handler(request, h) {
    request.yar.set('formSession', getSession(request, 'formSession'))

    // Record the journey start once per session (consent-free, EQ-472) — this is
    // the first page after the "Start now" button.
    const started = recordOncePerSession(request, {
      sessionKey: 'journeyStarted',
      record: recordJourneyStart,
      logMessage: 'Journey start recorded for this session (EQ-472)'
    })

    return h.view('qualifying-questions/start/index', {
      values: { registrationChoice: request.yar.get(REGISTRATION_CHOICE_KEY) },
      analyticsEvent: started ? analyticsEvents.journeyStart : undefined
    })
  }
}

// The choice isn't an answer for the backend, so it has its own session key
// rather than going in formSession, and this page sits outside the journey map.
export const post = {
  handler(request, h) {
    const registrationChoice = request.payload['registrationChoice']

    request.yar.set(REGISTRATION_CHOICE_KEY, registrationChoice)

    return h.redirect(
      registrationChoice === UPDATE_REGISTRATION ? UPDATE_PAGE : FIRST_REGISTRATION_PAGE
    )
  }
}
