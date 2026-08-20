import { statusCodes } from '../constants/status-codes.js'

function statusCodeMessage(statusCode) {
  switch (statusCode) {
    case statusCodes.notFound:
      return 'Page not found'
    case statusCodes.forbidden:
      return 'Forbidden'
    case statusCodes.unauthorized:
      return 'Unauthorized'
    case statusCodes.badRequest:
      return 'Bad Request'
    default:
      return 'Something went wrong'
  }
}

export function catchAll(request, h) {
  const { response } = request

  if (!('isBoom' in response)) {
    return h.continue
  }

  // Plugins (e.g. @defra/hapi-oidc-auth) throw plain errors carrying an intended
  // `.statusCode` (401/422). Hapi boomifies those to a 500 `output.statusCode`,
  // so recover the intended client-error code when present.
  const boomStatus = response.output.statusCode
  const thrown = response.statusCode
  const statusCode =
    boomStatus >= statusCodes.internalServerError &&
    Number.isInteger(thrown) &&
    thrown >= statusCodes.badRequest &&
    thrown < statusCodes.internalServerError
      ? thrown
      : boomStatus
  const errorMessage = statusCodeMessage(statusCode)

  if (statusCode >= statusCodes.internalServerError) {
    request.logger.error(response?.stack)
  }

  return h
    .view('error/index', {
      pageTitle: errorMessage,
      heading: statusCode,
      message: errorMessage
    })
    .code(statusCode)
}
