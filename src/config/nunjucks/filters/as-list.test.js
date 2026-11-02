import { asList } from './as-list.js'

describe('#asList', () => {
  test('Should wrap a string in a list', () => {
    expect(asList('store')).toEqual(['store'])
  })

  test('Should return an array unchanged', () => {
    const values = ['use', 'store']

    expect(asList(values)).toBe(values)
  })

  test.each([undefined, null])('Should return %s unchanged', (value) => {
    expect(asList(value)).toBe(value)
  })
})
