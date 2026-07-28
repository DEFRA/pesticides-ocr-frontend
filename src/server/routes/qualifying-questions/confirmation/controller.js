import { randomInt } from 'node:crypto'

const generateReference = () => {
  const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const firstSectionLength = 3
  const secondSectionLength = 2
  const digits = (length) => String(randomInt(10 ** length)).padStart(length, '0')
  const letter = LETTERS[randomInt(LETTERS.length)]
  return `PPP-${digits(firstSectionLength)}-${digits(secondSectionLength)}${letter}`
}

export const get = {
  handler(_request, h) {
    return h.view('qualifying-questions/confirmation/confirmation', {
      reference: generateReference()
    })
  },
  options: {
    app: {
      pageTitle: 'Confirmation'
    }
  }
}
