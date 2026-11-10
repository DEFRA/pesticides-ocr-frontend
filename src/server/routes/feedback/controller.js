import Boom from '@hapi/boom'
import { config } from '#/config/config.js'
import {
  recordFeedbackStart,
  recordFeedbackCompletion,
  recordOncePerSession
} from '#/server/common/helpers/journey-beacon.js'

export const getFeedback = {
  handler(request, h) {
    const surveyUrl = config.get('feedbackSurveyUrl')
    if (!surveyUrl) {
      request.logger.warn('Feedback survey URL is not configured')
      throw Boom.serverUnavailable('Feedback survey is not available')
    }

    recordOncePerSession(request, {
      sessionKey: 'feedbackStarted',
      record: recordFeedbackStart,
      logMessage: 'Feedback start recorded for this session (EQ-706)'
    })

    return h.redirect(surveyUrl)
      .header('Cache-Control', 'no-store')
      .header('Referrer-Policy', 'no-referrer')
  }
}

export const getThankYou = {
  options: { app: { pageTitle: 'Thank you for your feedback' } },
  handler(request, h) {
    recordOncePerSession(request, {
      sessionKey: 'feedbackCompleted',
      record: recordFeedbackCompletion,
      logMessage: 'Feedback completion recorded for this session (EQ-706)'
    })

    return h.view('feedback/index').header('Cache-Control', 'no-store')
  }
}
