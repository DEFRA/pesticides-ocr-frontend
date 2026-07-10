import { describe, test, expect } from 'vitest'

describe('router plugin', () => {
  test('Should define router plugin', async () => {
    const { router } = await import('./router.js')

    expect(router).toBeDefined()
    expect(router.plugin).toBeDefined()
    expect(router.plugin.name).toBe('router')
    expect(router.plugin.register).toBeDefined()
    expect(typeof router.plugin.register).toBe('function')
  })
})
