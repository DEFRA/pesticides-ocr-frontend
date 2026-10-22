import { getSectionAnswers, setSectionAnswer } from './section-answers.js'

// The answers to the processing PPPs pages (routes/processing-ppps).
export const PROCESSING_PPPS_KEY = 'processingPPPs'

export const getProcessingPPPsAnswers = (formSession) =>
  getSectionAnswers(formSession, PROCESSING_PPPS_KEY)

export const setProcessingPPPsAnswer = (formSession, key, value) =>
  setSectionAnswer(formSession, PROCESSING_PPPS_KEY, key, value)
