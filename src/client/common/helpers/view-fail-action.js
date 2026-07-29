import { buildErrorSummary } from './build-error-summary.js'

export function viewFailAction(view) {
  return function failAction(request, h, error) {
    const viewContext = {
      ...buildErrorSummary(error),
      values: request.payload
    }

    return h.view(view, viewContext).takeover()
  }
}
