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
  handler(request, h) {
    let reference
    const formSession = request.yar.get('formSession') ?? {}

    if (formSession['confirmation-reference']) {
      reference = formSession['confirmation-reference']
    } else {
      reference = generateReference()
      formSession['confirmation-reference'] = reference
      request.yar.set('formSession', formSession)
    }

    return h.view('amateur-sellers/confirmation/confirmation', {
      reference
    })
  }
}
