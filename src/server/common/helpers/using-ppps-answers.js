import { getSectionAnswers, setSectionAnswer } from './section-answers.js'

export const USING_PPPS_KEY = 'usingPPPs'

export const getUsingPPPsAnswers = (formSession) => getSectionAnswers(formSession, USING_PPPS_KEY)

export const setUsingPPPsAnswer = (formSession, key, value) =>
  setSectionAnswer(formSession, USING_PPPS_KEY, key, value)
