import { PROCESSING_PPPS_KEY } from '#/server/common/constants/session-keys.js'
import { getSectionAnswers, setSectionAnswer } from './section-answers.js'

export const getProcessingPPPsAnswers = (formSession) =>
  getSectionAnswers(formSession, PROCESSING_PPPS_KEY)

export const setProcessingPPPsAnswer = (formSession, key, value) =>
  setSectionAnswer(formSession, PROCESSING_PPPS_KEY, key, value)
