import hapiPino from 'hapi-pino'
import { config } from '#/config/config.js'
import { loggerOptions } from './logger-options.js'

const shouldLogRequest = (request) =>
  config.get('log.httpRequests') &&
  !request.path.startsWith('/public') &&
  request.path !== '/health' &&
  request.path !== '/favicon.ico'

const requestLogger = {
  plugin: hapiPino,
  options: {
    logRequestStart: shouldLogRequest,
    logRequestComplete: shouldLogRequest,
    ...loggerOptions
  }
}

export { requestLogger }
