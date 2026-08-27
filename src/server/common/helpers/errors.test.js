import { vi } from 'vitest'

import { catchAll } from './errors.js'
import { createServer } from '../../server.js'
import { statusCodes } from '../constants/status-codes.js'

describe('#errors', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('Should provide expected Not Found page', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/non-existent-path'
    })

    expect(result).toEqual(
      expect.stringContaining('Page not found | OCR Register')
    )
    expect(statusCode).toBe(statusCodes.notFound)
  })
})

describe('#catchAll', () => {
  const mockErrorLogger = vi.fn()
  const mockWarnLogger = vi.fn()
  const mockStack = 'Mock error stack'
  const errorPage = 'error/index'
  const mockRequest = (statusCode) => ({
    response: {
      isBoom: true,
      stack: mockStack,
      output: {
        statusCode
      }
    },
    logger: { error: mockErrorLogger, warn: mockWarnLogger }
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })
  const mockToolkitView = vi.fn()
  const mockToolkitCode = vi.fn()
  const mockToolkit = {
    view: mockToolkitView.mockReturnThis(),
    code: mockToolkitCode.mockReturnThis()
  }

  // A request whose Boom response carries a plugin-thrown 4xx `.statusCode`
  // (which Hapi boomifies to a 500 output) — the recovered-client-error case.
  const recoveredClientErrorRequest = (
    message = 'ID token audience mismatch'
  ) => ({
    path: '/auth/entra/callback',
    response: {
      isBoom: true,
      stack: mockStack,
      message,
      statusCode: statusCodes.unauthorized,
      output: { statusCode: statusCodes.internalServerError }
    },
    logger: { error: mockErrorLogger, warn: mockWarnLogger }
  })

  test('Should provide expected "Not Found" page', () => {
    catchAll(mockRequest(statusCodes.notFound), mockToolkit)

    expect(mockErrorLogger).not.toHaveBeenCalledWith(mockStack)
    expect(mockToolkitView).toHaveBeenCalledWith(errorPage, {
      pageTitle: 'Page not found',
      heading: statusCodes.notFound,
      message: 'Page not found'
    })
    expect(mockToolkitCode).toHaveBeenCalledWith(statusCodes.notFound)
  })

  test('Should provide expected "Forbidden" page', () => {
    catchAll(mockRequest(statusCodes.forbidden), mockToolkit)

    expect(mockErrorLogger).not.toHaveBeenCalledWith(mockStack)
    expect(mockToolkitView).toHaveBeenCalledWith(errorPage, {
      pageTitle: 'Forbidden',
      heading: statusCodes.forbidden,
      message: 'Forbidden'
    })
    expect(mockToolkitCode).toHaveBeenCalledWith(statusCodes.forbidden)
  })

  test('Should provide expected "Unauthorized" page', () => {
    catchAll(mockRequest(statusCodes.unauthorized), mockToolkit)

    expect(mockErrorLogger).not.toHaveBeenCalledWith(mockStack)
    expect(mockToolkitView).toHaveBeenCalledWith(errorPage, {
      pageTitle: 'Unauthorized',
      heading: statusCodes.unauthorized,
      message: 'Unauthorized'
    })
    expect(mockToolkitCode).toHaveBeenCalledWith(statusCodes.unauthorized)
  })

  test('Should provide expected "Bad Request" page', () => {
    catchAll(mockRequest(statusCodes.badRequest), mockToolkit)

    expect(mockErrorLogger).not.toHaveBeenCalledWith(mockStack)
    expect(mockToolkitView).toHaveBeenCalledWith(errorPage, {
      pageTitle: 'Bad Request',
      heading: statusCodes.badRequest,
      message: 'Bad Request'
    })
    expect(mockToolkitCode).toHaveBeenCalledWith(statusCodes.badRequest)
  })

  test('Should provide expected default page', () => {
    catchAll(mockRequest(statusCodes.imATeapot), mockToolkit)

    expect(mockErrorLogger).not.toHaveBeenCalledWith(mockStack)
    expect(mockToolkitView).toHaveBeenCalledWith(errorPage, {
      pageTitle: 'Something went wrong',
      heading: statusCodes.imATeapot,
      message: 'Something went wrong'
    })
    expect(mockToolkitCode).toHaveBeenCalledWith(statusCodes.imATeapot)
  })

  test('Should provide expected "Something went wrong" page and log error for internalServerError', () => {
    catchAll(mockRequest(statusCodes.internalServerError), mockToolkit)

    expect(mockErrorLogger).toHaveBeenCalledWith(mockStack)
    expect(mockWarnLogger).not.toHaveBeenCalled()
    expect(mockToolkitView).toHaveBeenCalledWith(errorPage, {
      pageTitle: 'Something went wrong',
      heading: statusCodes.internalServerError,
      message: 'Something went wrong'
    })
    expect(mockToolkitCode).toHaveBeenCalledWith(
      statusCodes.internalServerError
    )
  })

  test('Should recover a plugin-thrown client-error .statusCode instead of the boomified 500', () => {
    // @defra/hapi-oidc-auth throws plain errors carrying .statusCode (401/422);
    // Hapi boomifies those to a 500 output, so catchAll must surface the intended code.
    catchAll(recoveredClientErrorRequest(), mockToolkit)

    expect(mockToolkitView).toHaveBeenCalledWith(errorPage, {
      pageTitle: 'Unauthorized',
      heading: statusCodes.unauthorized,
      message: 'Unauthorized'
    })
    expect(mockToolkitCode).toHaveBeenCalledWith(statusCodes.unauthorized)
  })

  test('Should log the underlying reason server-side for a recovered client error, without exposing it', () => {
    catchAll(recoveredClientErrorRequest(), mockToolkit)

    // Reason (and route) logged server-side via warn, not error...
    expect(mockWarnLogger).toHaveBeenCalledWith(
      {
        statusCode: statusCodes.unauthorized,
        path: '/auth/entra/callback',
        reason: 'ID token audience mismatch'
      },
      'Downstream plugin returned a client error'
    )
    expect(mockErrorLogger).not.toHaveBeenCalled()
    // ...and never rendered into the client-facing page.
    expect(mockToolkitView).toHaveBeenCalledWith(errorPage, {
      pageTitle: 'Unauthorized',
      heading: statusCodes.unauthorized,
      message: 'Unauthorized'
    })
  })

  test('Should NOT warn-log for a genuine boom client error (e.g. 404)', () => {
    catchAll(mockRequest(statusCodes.notFound), mockToolkit)
    expect(mockWarnLogger).not.toHaveBeenCalled()
  })

  test('Should include the error details array in the server-side log when present', () => {
    const details = ['clientId', 'clientSecret']
    const request = {
      path: '/auth/entra/start',
      response: {
        isBoom: true,
        stack: mockStack,
        message: 'Microsoft Entra live configuration is incomplete',
        details,
        statusCode: statusCodes.badRequest,
        output: { statusCode: statusCodes.internalServerError }
      },
      logger: { error: mockErrorLogger, warn: mockWarnLogger }
    }

    catchAll(request, mockToolkit)

    expect(mockWarnLogger).toHaveBeenCalledWith(
      {
        statusCode: statusCodes.badRequest,
        path: '/auth/entra/start',
        reason: 'Microsoft Entra live configuration is incomplete',
        details
      },
      'Downstream plugin returned a client error'
    )
  })
})
