import Boom from '@hapi/boom'
import { config } from '#/config/config.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'

export async function searchRegistration(reference) {
  const url = new URL(`${config.get('ocrBackend.url')}/search`)
  url.searchParams.set('reference', reference)
  let response

  const fetchOptions = {
    method: 'GET',
    headers: { accept: 'application/json' }
  }

  try {
    response = await fetch(url, fetchOptions)
  } catch (error) {
    return Boom.serverUnavailable('Search API unavailable')
  }

  if (response.status === statusCodes.notFound) {
    return { statusCode: statusCodes.notFound, message: 'Registration not found' }
  }

  if (!response.ok) {
    const error = await response.json()
    return Boom.badRequest(`${error.message}`)
  }

  return response.json()
}
