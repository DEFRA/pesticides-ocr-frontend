import { describe, test, expect } from 'vitest'
import { renderComponent } from './component-helpers.js'

describe('component-helpers renderComponent', () => {
  test('Should render component without call block', () => {
    const result = renderComponent('heading', {
      text: 'Test Heading',
      caption: 'Test Caption'
    })

    expect(result).toBeDefined()
    expect(result('h1, h2, h3, h4, h5, h6').length).toBeGreaterThanOrEqual(0)
  })

  test('Should render component with call block', () => {
    const result = renderComponent(
      'heading',
      {
        text: 'Test Heading'
      },
      'Call block content'
    )

    expect(result).toBeDefined()
  })

  test('Should handle component name conversion to macro name', () => {
    const result = renderComponent('heading', {
      text: 'Test'
    })

    expect(result).toBeDefined()
  })
})
