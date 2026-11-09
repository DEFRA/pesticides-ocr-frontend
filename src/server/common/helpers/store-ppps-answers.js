import { STORING_PPPS_KEY } from '#/server/common/constants/session-keys.js'
import { getSectionAnswers, setSectionAnswer } from './section-answers.js'

export const getStorePPPsAnswers = (formSession) =>
  getSectionAnswers(formSession, STORING_PPPS_KEY)

export const setStorePPPsAnswer = (formSession, key, value) =>
  setSectionAnswer(formSession, STORING_PPPS_KEY, key, value)
