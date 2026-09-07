import { searchRegistration } from './search.js'

const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' }
  })

describe('#searchRegistration', () => {
  let fetchMock

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test('Should post the reference to the search API', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ reference: 'PP-ABC-123' }))

    const result = await searchRegistration('PP-ABC-123')

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3001/search', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ reference: 'PP-ABC-123' })
    })
    expect(result).toEqual({ reference: 'PP-ABC-123' })
  })

  test('Should return null when the registration is not found', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, 404))

    expect(await searchRegistration('PP-ZZZ-999')).toBeNull()
  })

  test('Should return null when the search API is unreachable', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'))

    expect(await searchRegistration('PP-ABC-123')).toBeNull()
  })

  test('Should throw a bad gateway error when the search API fails', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, 500))

    await expect(searchRegistration('PP-ABC-123')).rejects.toMatchObject({
      isBoom: true,
      output: { statusCode: 502 }
    })
  })
})
