import { createHmac } from 'node:crypto'
import { config } from '#/config/config.js'
import { createServer } from '#/server/server.js'

const SECRET = 'feedback-route-test-secret'

describe('feedback routes', () => {
  let server
  let originalBackend
  let originalSecret
  let originalSurvey
  let fetch

  beforeAll(async () => {
    originalBackend = config.get('ocrBackend.url')
    originalSecret = config.get('journeyToken.secret')
    originalSurvey = config.get('feedbackSurveyUrl')
    config.set('ocrBackend.url', 'https://backend.test')
    config.set('journeyToken.secret', SECRET)
    config.set('feedbackSurveyUrl', 'https://survey.test/satisfaction')
    server = await createServer()
    await server.initialize()
  })

  beforeEach(() => {
    fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, status: 204 })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    config.set('feedbackSurveyUrl', 'https://survey.test/satisfaction')
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
    config.set('ocrBackend.url', originalBackend)
    config.set('journeyToken.secret', originalSecret)
    config.set('feedbackSurveyUrl', originalSurvey)
  })

  const cookieFrom = (response) => response.headers['set-cookie'][0].split(';')[0]

  test('opens the survey without forwarding request query data; counts starts and returns once with the same signed session token', async () => {
    const first = await server.inject({ method: 'GET', url: '/feedback?journey=must-not-forward' })
    expect(first.statusCode).toBe(302)
    expect(first.headers.location).toBe('https://survey.test/satisfaction')
    expect(first.headers['cache-control']).toContain('no-store')
    expect(first.headers['referrer-policy']).toBe('no-referrer')
    const cookie = cookieFrom(first)

    await server.inject({ method: 'GET', url: '/feedback', headers: { cookie } })
    const thankYou = await server.inject({ method: 'GET', url: '/feedback/thank-you', headers: { cookie } })
    await server.inject({ method: 'GET', url: '/feedback/thank-you', headers: { cookie } })

    expect(thankYou.statusCode).toBe(200)
    expect(thankYou.result).toContain('Thank you for your feedback')
    expect(thankYou.result).toContain('href="/">Return to the service start page</a>')
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(fetch.mock.calls.map(([url]) => url.toString())).toEqual([
      'https://backend.test/metrics/feedback-starts',
      'https://backend.test/metrics/feedback-returns'
    ])
    const firstToken = fetch.mock.calls[0][1].headers['x-journey-token']
    expect(fetch.mock.calls[1][1].headers['x-journey-token']).toBe(firstToken)
    const [nonce, signature] = firstToken.split('.')
    expect(signature).toBe(createHmac('sha256', SECRET).update(nonce).digest('hex'))
  })

  test('direct thank-you visits create a signed session without requiring an applicant journey', async () => {
    const first = await server.inject({ method: 'GET', url: '/feedback/thank-you' })
    expect(first.statusCode).toBe(200)
    expect(first.headers['cache-control']).toContain('no-store')
    await server.inject({
      method: 'GET',
      url: '/feedback/thank-you',
      headers: { cookie: cookieFrom(first) }
    })
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch.mock.calls[0][1].headers['x-journey-token']).toBeTruthy()
  })

  test('backend delivery failures do not prevent redirect or thank-you rendering', async () => {
    fetch.mockRejectedValue(new Error('backend unavailable'))
    const first = await server.inject({ method: 'GET', url: '/feedback' })
    const second = await server.inject({ method: 'GET', url: '/feedback/thank-you' })
    expect(first.statusCode).toBe(302)
    expect(second.statusCode).toBe(200)
  })

  test('an unconfigured survey fails explicitly without recording a start', async () => {
    config.set('feedbackSurveyUrl', '')
    const response = await server.inject({ method: 'GET', url: '/feedback' })
    expect(response.statusCode).toBe(503)
    expect(fetch).not.toHaveBeenCalled()
  })
})
