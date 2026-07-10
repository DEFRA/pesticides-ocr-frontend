import { describe, test, expect, vi, beforeEach } from 'vitest'

describe('router plugin vite middleware integration', () => {
  let mockRegister

  beforeEach(() => {
    mockRegister = vi.fn()
  })

  test('Should have async register function that can be called', async () => {
    const { router } = await import('./router.js')

    expect(router.plugin.register).toBeDefined()
    expect(typeof router.plugin.register).toBe('function')

    const mockServer = {
      register: mockRegister.mockResolvedValue()
    }

    await expect(router.plugin.register(mockServer)).resolves.not.toThrow()
  })
})
