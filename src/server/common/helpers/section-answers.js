// A section of the journey (using PPPs, processing PPPs) keeps its answers
// under one key in formSession, so they're sent to the backend as one object.
// These read and write a section's answers by that key.
export const getSectionAnswers = (formSession, sectionKey) => formSession?.[sectionKey] ?? {}

export function setSectionAnswer(formSession, sectionKey, key, value) {
  formSession[sectionKey] = { ...getSectionAnswers(formSession, sectionKey), [key]: value }
}
