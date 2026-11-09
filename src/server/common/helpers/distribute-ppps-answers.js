import { DISTRIBUTING_PPPS_KEY } from '#/server/common/constants/session-keys.js'
import { getSectionAnswers, setSectionAnswer } from './section-answers.js'

export const getDistributePPPsAnswers = (formSession) =>
  getSectionAnswers(formSession, DISTRIBUTING_PPPS_KEY)

export const setDistributePPPsAnswer = (formSession, key, value) =>
  setSectionAnswer(formSession, DISTRIBUTING_PPPS_KEY, key, value)
