const isFinished = (entry) => Boolean(entry.address && entry.contact && entry.activity)

export function removeUnfinishedAddresses(formSession) {
  if (!formSession['additionalAddresses']) {
    return formSession
  }

  return {
    ...formSession,
    additionalAddresses: formSession['additionalAddresses'].filter(isFinished)
  }
}
