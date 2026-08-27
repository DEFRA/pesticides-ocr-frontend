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

// Build a structured, greppable server-side log payload for an error response —
// the route and reason, plus any `details` array a plugin attached. Server-side
// only; never rendered to the user.
function buildErrorLogPayload(request, statusCode) {
  const { response } = request
  const payload = { statusCode, path: request.path, reason: response.message }
  if (response.details?.length) {
    payload.details = response.details
  }
  return payload
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
    // A plugin may raise an upstream 5xx (e.g. 502/503/504 from Entra/JWKS) that
    // Hapi boomifies to a generic 500; the stack alone can hide the real reason,
    // so also log it (with route/details) when the error carries a message.
    if (response.message) {
      request.logger.error(
        buildErrorLogPayload(request, statusCode),
        'Plugin returned a server error'
      )
    }
  } else if (isRecoveredClientError) {
    // The client-facing page shows only a generic message, so the specific
    // reason (e.g. why an Entra sign-in was rejected) is otherwise lost. Record
    // it server-side only for diagnosis — never surface it to the user.
    request.logger.warn(
      buildErrorLogPayload(request, statusCode),
      'Downstream plugin returned a client error'
    )
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
