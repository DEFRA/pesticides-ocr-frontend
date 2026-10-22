// The answers to the using PPPs pages (routes/using-ppps) are grouped under
// one key in formSession, so they're sent to the backend as one object.
export const USING_PPPS_KEY = 'usingPPPs'

export const getUsingPPPsAnswers = (formSession = {}) => formSession[USING_PPPS_KEY] ?? {}

export function setUsingPPPsAnswer(formSession, key, value) {
  formSession[USING_PPPS_KEY] = { ...getUsingPPPsAnswers(formSession), [key]: value }
}
