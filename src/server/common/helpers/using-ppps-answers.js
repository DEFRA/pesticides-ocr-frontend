import { USING_PPPS_KEY } from '#/server/common/constants/session-keys.js'
import { getSectionAnswers, setSectionAnswer } from './section-answers.js'

export const getUsingPPPsAnswers = (formSession) => getSectionAnswers(formSession, USING_PPPS_KEY)

export const setUsingPPPsAnswer = (formSession, key, value) =>
  setSectionAnswer(formSession, USING_PPPS_KEY, key, value)
