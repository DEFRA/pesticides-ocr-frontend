import { splitOtherAnswer } from './split-other-answer.js'

describe('#splitOtherAnswer', () => {
  const knownValues = ['red-tractor', 'leaf']

  test('Should return the known values as selected', () => {
    expect(splitOtherAnswer(['red-tractor', 'leaf'], knownValues)).toEqual({
      selected: ['red-tractor', 'leaf'],
      other: undefined
    })
  })

  test('Should return an unknown answer as the other text', () => {
    expect(splitOtherAnswer(['Local scheme'], knownValues)).toEqual({
      selected: [],
      other: 'Local scheme'
    })
  })

  test('Should ignore an empty answer', () => {
    expect(splitOtherAnswer([undefined], knownValues)).toEqual({
      selected: [],
      other: undefined
    })
  })

  test('Should return nothing when no answers are held', () => {
    expect(splitOtherAnswer(undefined, knownValues)).toEqual({
      selected: [],
      other: undefined
    })
  })
})
