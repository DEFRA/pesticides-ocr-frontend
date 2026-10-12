import { buildErrorSummary } from './build-error-summary.js'

export function viewFailAction(view, buildContext = () => ({})) {
  return function failAction(request, h, error) {
    const viewContext = {
      ...buildContext(request),
      ...buildErrorSummary(error),
      values: request.payload
    }

    return h.view(view, viewContext).takeover()
  }
}
