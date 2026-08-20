import { renderComponent } from '#/test-helpers/component-helpers.js'

describe('Answer List Component', () => {
  test('Should put each answer on its own line', () => {
    const $list = renderComponent('answer-list', {
      values: ['Sell professional PPPs', 'Sell amateur PPPs']
    })

    expect($list('body').html()).toBe('Sell professional PPPs<br>Sell amateur PPPs')
  })

  test('Should render a single answer without a line break', () => {
    const $list = renderComponent('answer-list', {
      values: ['Professional user']
    })

    expect($list('body').html()).toBe('Professional user')
  })

  test('Should render nothing when there are no answers', () => {
    const $list = renderComponent('answer-list', { values: [] })

    expect($list('body').html()).toBe('')
  })
})
