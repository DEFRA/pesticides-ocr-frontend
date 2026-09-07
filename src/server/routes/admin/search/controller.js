import { searchRegistration } from '#/server/services/search.js'
import { buildManualErrorSummary } from '#/client/common/helpers/build-error-summary.js'

export const get = {
  handler(_request, h) {
    return h.view('admin/search/index')
  }
}

export const post = {
  async handler(request, h) {
    const reference = request.payload['registration-reference']
    const registration = await searchRegistration(reference)

    if (!registration) {
      return h.view('admin/search/index', { reference })
    }

    if (registration.isBoom) {
      const errorList = buildManualErrorSummary([registration.output.payload]).errorList
      return h.view('admin/search/index', {
        values: request.payload,
        errorList
      })
    }

    return h.view('admin/search/index', {
      values: request.payload,
      searched: true,
      reference,
      registration
    })
  }
}
