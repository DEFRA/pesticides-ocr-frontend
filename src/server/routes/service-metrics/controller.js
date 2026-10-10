import { statusCodes } from '#/server/common/constants/status-codes.js'
import {
  backendErrorResponse,
  UNAVAILABLE_MESSAGE
} from '#/server/common/helpers/backend-error-response.js'
import { getForwardedToken } from '#/server/common/helpers/forwarded-token.js'
import { app } from './options.js'
import { fetchJourneyMetrics } from './metrics-client.js'

const VIEW = 'service-metrics/index'

const FORBIDDEN_MESSAGE =
  'You do not have permission to view the service metrics'

const PERCENT = 100

const monthLabel = (month) =>
  new Date(`${month}-01T00:00:00Z`).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  })

const percentage = (rate) =>
  typeof rate === 'number' ? `${Math.round(rate * PERCENT)}%` : 'No starts'

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

const errorView = (h, statusCode) =>
  h.view(VIEW, {
    pageTitle: `Error: ${app.pageTitle}`,
    errorList: [
      {
        text:
          statusCode === statusCodes.forbidden
            ? FORBIDDEN_MESSAGE
            : UNAVAILABLE_MESSAGE
      }
    ]
  })

export const serviceMetricsController = {
  async handler(request, h) {
    try {
      const metrics = await fetchJourneyMetrics(getForwardedToken(request))
      return h.view(VIEW, { rows: toRows(metrics) })
    } catch (err) {
      return backendErrorResponse(err, request, h, {
        label: 'Metrics',
        render: (statusCode) => errorView(h, statusCode)
      })
    }
  }
}
