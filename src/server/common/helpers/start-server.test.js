import { vi } from 'vitest'

import { readFileSync } from 'node:fs'
import hapi from '@hapi/hapi'
import { statusCodes } from '../constants/status-codes.js'

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    readFileSync: vi.fn(actual.readFileSync)
  }
})

describe('#startServer', () => {
  let createServerSpy
  let hapiServerSpy
  let startServerImport
  let createServerImport

  beforeAll(async () => {
    vi.stubEnv('PORT', '3097')

    createServerImport = await import('../../server.js')
    startServerImport = await import('./start-server.js')

    createServerSpy = vi.spyOn(createServerImport, 'createServer')
    hapiServerSpy = vi.spyOn(hapi, 'server')
  })

  afterAll(() => {
    vi.unstubAllEnvs()
  })

  describe('When server starts', () => {
    let server

    afterAll(async () => {
      await server.stop({ timeout: 0 })
    })

    test('Should start up server as expected', async () => {
      server = await startServerImport.startServer()

      expect(createServerSpy).toHaveBeenCalled()
      expect(hapiServerSpy).toHaveBeenCalled()

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/health'
      })

      expect(result).toEqual({ message: 'success' })
      expect(statusCode).toBe(statusCodes.ok)
    })

    test('Should log overridden environment variables', async () => {
      const loggerSpy = vi.spyOn(server.logger, 'info')
      vi.mocked(readFileSync).mockReturnValueOnce('PORT=3097')
      createServerSpy.mockResolvedValueOnce(server)

      await startServerImport.startServer()

      expect(loggerSpy).toHaveBeenCalledWith(
        { PORT: '3097' },
        'Overridden environment variables'
      )
    })

    test('Should log no env overrides found', async () => {
      const loggerSpy = vi.spyOn(server.logger, 'info')
      vi.mocked(readFileSync).mockReturnValueOnce('')
      createServerSpy.mockResolvedValueOnce(server)

      await startServerImport.startServer()

      expect(loggerSpy).toHaveBeenCalledWith('No env overrides found')
    })

    test('Should log no .env file found', async () => {
      const loggerSpy = vi.spyOn(server.logger, 'info')
      vi.mocked(readFileSync).mockImplementationOnce(() => {
        throw new Error('File not found')
      })
      createServerSpy.mockResolvedValueOnce(server)

      await startServerImport.startServer()

      expect(loggerSpy).toHaveBeenCalledWith('No .env file found')
    })
  })

  describe('When server start fails', () => {
    test('Should log failed startup message', async () => {
      createServerSpy.mockRejectedValue(new Error('Server failed to start'))

      await expect(startServerImport.startServer()).rejects.toThrow(
        'Server failed to start'
      )
    })
  })
})
