import { PAGE_PATHS } from '@defra/hapi-oidc-auth'

import { statusCodes } from '#/server/common/constants/status-codes.js'
import { getForwardedToken } from '#/server/common/helpers/forwarded-token.js'
import { app } from './options.js'
import { fetchJourneyMetrics } from './metrics-client.js'

const VIEW = 'service-metrics/index'

const FORBIDDEN_MESSAGE = 'You do not have permission to view the service metrics'
const UNAVAILABLE_MESSAGE =
  'Sorry, there is a problem with the service. Try again later.'

const PERCENT = 100

const monthLabel = (month) =>
  new Date(`${month}-01T00:00:00Z`).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  })

const percentage = (rate) =>
  rate === null ? 'No starts' : `${Math.round(rate * PERCENT)}%`

const numeric = (value) => ({ text: String(value), format: 'numeric' })

const toRow = (label, figures) => [
  { text: label },
  numeric(figures.starts),
  numeric(figures.registrations),
  numeric(figures.notEligible),
  numeric(figures.finished),
  numeric(figures.dropOuts),
  { text: percentage(figures.completionRate), format: 'numeric' }
]

const toRows = (metrics) => [
  toRow('All time', metrics),
  ...metrics.byMonth.map((month) => toRow(monthLabel(month.month), month))
]

// A backend 401 means the case officer's token has expired, so they sign in
// again. Any other API error is shown on the page.
function handleApiError(err, request, h) {
  if (err.statusCode === statusCodes.unauthorized) {
    return h.redirect(`${PAGE_PATHS.ENTRA_SIGN_IN}?error=session-expired`)
  }
  if (!Number.isInteger(err.statusCode)) {
    throw err
  }
  const message =
    err.statusCode === statusCodes.forbidden
      ? FORBIDDEN_MESSAGE
      : UNAVAILABLE_MESSAGE
  const view = h.view(VIEW, {
    pageTitle: `Error: ${app.pageTitle}`,
    errorList: [{ text: message }]
  })
  if (err.statusCode >= statusCodes.internalServerError) {
    request.logger.error(err, `Metrics API error: ${err.message}`)
    return view.code(err.statusCode)
  }
  request.logger.warn(`Metrics API error: ${err.message}`)
  return view
}

export const serviceMetricsController = {
  async handler(request, h) {
    try {
      const metrics = await fetchJourneyMetrics(getForwardedToken(request))
      return h.view(VIEW, { rows: toRows(metrics) })
    } catch (err) {
      return handleApiError(err, request, h)
    }
  }
}
