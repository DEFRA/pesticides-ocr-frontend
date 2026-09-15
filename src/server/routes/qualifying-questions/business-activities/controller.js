import { getSession } from '#/server/common/helpers/get-session.js'
import { recordJourneyStart } from '#/server/common/helpers/journey-beacon.js'

export const get = {
  handler(request, h) {
    request.yar.set('formSession', request.yar.get('formSession') ?? {})

    // Record the journey start once per session (consent-free, EQ-472). This is
    // the first page after the "Start now" button. Set the flag first, then
    // fire-and-forget the beacon (do not await) so a slow or failing metrics
    // write can never delay or break the page.
    if (!request.yar.get('journeyStarted')) {
      request.yar.set('journeyStarted', true)
      // One line per session (this branch runs once per session), so the logs
      // demonstrate the de-duplication: refreshes / back-navigation don't re-log.
      // No PII — just the event.
      request.logger.info('Journey start recorded for this session (EQ-472)')
      // Deliberately not awaited — the beacon is best-effort and self-contained
      // (it catches its own errors), so a floating promise is intended here.
      recordJourneyStart(request)
    }

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
