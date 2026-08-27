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
  const isRecoveredClientError =
    boomStatus >= statusCodes.internalServerError &&
    Number.isInteger(thrown) &&
    thrown >= statusCodes.badRequest &&
    thrown < statusCodes.internalServerError
  const statusCode = isRecoveredClientError ? thrown : boomStatus
  const errorMessage = statusCodeMessage(statusCode)

  if (statusCode >= statusCodes.internalServerError) {
    request.logger.error(response?.stack)
  } else if (isRecoveredClientError) {
    // The client-facing page shows only a generic message, so the specific
    // reason (e.g. why an Entra sign-in was rejected) is otherwise lost. Record
    // it server-side only for diagnosis — never surface it to the user.
    const logPayload = { statusCode, path: request.path, reason: response.message }
    // Some plugin errors (e.g. incomplete Entra config) carry a `details` array
    // with the actionable specifics; include it when present.
    if (response.details?.length) {
      logPayload.details = response.details
    }
    request.logger.warn(logPayload, 'Downstream plugin returned a client error')
  } else {
    // Genuine Boom client error (e.g. 404/403): the generic page is enough and
    // the reason is already meaningful, so nothing extra is logged.
  }

  return h
    .view('error/index', {
      pageTitle: errorMessage,
      heading: statusCode,
      message: errorMessage
    })
    .code(statusCode)
}
