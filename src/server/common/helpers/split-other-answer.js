export function splitOtherAnswer(answers = [], knownValues = []) {
  return {
    selected: answers.filter((answer) => knownValues.includes(answer)),
    other: answers.find((answer) => answer && !knownValues.includes(answer))
  }
}
