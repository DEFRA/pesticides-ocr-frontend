import { searchRegistration } from '#/server/services/search.js'
import { buildManualErrorSummary } from '#/client/common/helpers/build-error-summary.js'

const route = 'admin/search/index'

export const get = {
  handler(_request, h) {
    return h.view(route)
  }
}

export const post = {
  async handler(request, h) {
    const reference = request.payload['registration-reference']
    const registration = await searchRegistration(reference)

    if (registration.isBoom) {
      const errorList = buildManualErrorSummary([registration.output.payload]).errorList
      return h.view(route, {
        values: request.payload,
        errorList
      })
    }

    return h.view(route, {
      values: request.payload,
      searched: true,
      isFound: registration.isFound,
      reference,
      registration: registration.data
    })
  }
}
