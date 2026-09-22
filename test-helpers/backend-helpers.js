import { config } from '#/config/config.js'

export const testBackendUrl = 'http://localhost:3001'

const backendUrlKey = 'ocrBackend.url'

export function useTestBackendUrl(url = testBackendUrl) {
  let originalUrl

  beforeAll(() => {
    originalUrl = config.get(backendUrlKey)
    config.set(backendUrlKey, url)
  })

  afterAll(() => {
    config.set(backendUrlKey, originalUrl)
  })
}
