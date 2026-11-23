import { USING_PPPS_KEY } from '#/server/common/constants/session-keys.js'

// The using PPPs answers are kept together under formSession.usingPPPs, so
// they're sent to the backend as one object.
export const getUsingPPPsAnswers = (formSession) => formSession?.[USING_PPPS_KEY] ?? {}

export function setUsingPPPsAnswer(formSession, key, value) {
  formSession[USING_PPPS_KEY] = { ...getUsingPPPsAnswers(formSession), [key]: value }
}
