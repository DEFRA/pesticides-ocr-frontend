import { vi } from 'vitest'

import { getSession } from './get-session.js'

describe('#getSession', () => {
  const mockYarGet = vi.fn()
  const mockRequest = { yar: { get: mockYarGet } }

  test('Should return the stored session', () => {
    mockYarGet.mockReturnValue({ 'business-name': 'Company 1' })

    expect(getSession(mockRequest, 'formSession')).toEqual({
      'business-name': 'Company 1'
    })
  })

  test('Should read the requested session key', () => {
    mockYarGet.mockReturnValue({})

    getSession(mockRequest, 'formSession')

    expect(mockYarGet).toHaveBeenCalledWith('formSession')
  })

  test('Should return the stored session by reference so callers can add answers', () => {
    const formSession = {}
    mockYarGet.mockReturnValue(formSession)

    const session = getSession(mockRequest, 'formSession')
    session['business-name'] = 'Company 1'

    expect(formSession).toEqual({ 'business-name': 'Company 1' })
  })

  test('Should return an empty session when yar has no value', () => {
    mockYarGet.mockReturnValue(null)

    expect(getSession(mockRequest, 'formSession')).toEqual({})
  })

  test('Should return an empty session when yar returns undefined', () => {
    mockYarGet.mockReturnValue(undefined)

    expect(getSession(mockRequest, 'formSession')).toEqual({})
  })

  test('Should return a fresh empty session each time so cold sessions do not share state', () => {
    mockYarGet.mockReturnValue(null)

    const first = getSession(mockRequest, 'formSession')
    first['business-name'] = 'Company 1'

    expect(getSession(mockRequest, 'formSession')).toEqual({})
  })
})
