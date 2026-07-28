import { randomInt } from 'node:crypto'

const generateReference = () => {
  const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const digits = (length) => String(randomInt(10 ** length)).padStart(length, '0')
  const letter = LETTERS[randomInt(LETTERS.length)]
  return `PPP-${digits(3)}-${digits(2)}${letter}`
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
