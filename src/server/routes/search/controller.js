import { statusCodes } from '#/server/common/constants/status-codes.js'
import {
  backendErrorResponse,
  UNAVAILABLE_MESSAGE
} from '#/server/common/helpers/backend-error-response.js'
import { getForwardedToken } from '#/server/common/helpers/forwarded-token.js'
import { app, SEARCH_FIELD } from './options.js'
import { exampleReference, toReference } from './reference.js'
import { searchRegister } from './search-data.js'
import { buildPagination, pageHref } from './pagination.js'
import { buildResultRows } from './results-table.js'
import { fetchExport } from './search-client.js'

const VIEW = 'search/index'

const FORBIDDEN_MESSAGE = 'You do not have permission to search the register'

// Uses the configured prefix, so it is built per request.
const invalidReferenceMessage = () =>
  `Enter a reference in the correct format, like ${exampleReference()}`

// Context every render of the page needs.
const pageContext = (search) => ({
  exampleReference: exampleReference(),
  [SEARCH_FIELD]: search
})

// Error summary context for a single message. A message about the search term
// itself links to (and is shown on) the field; anything else is summary-only.
function errorContext(message, { onField = false } = {}) {
  return {
    pageTitle: `Error: ${app.pageTitle}`,
    errorList: [
      onField ? { text: message, href: `#${SEARCH_FIELD}` } : { text: message }
    ],
    errors: onField ? { [SEARCH_FIELD]: { text: message } } : {}
  }
}

// A 400 on a reference is the backend rejecting its format. A free-text term is
// already bounded to what the backend accepts, so any other 400 is unexpected
// and shown as a service problem.
function apiErrorContext(statusCode, isReference) {
  if (statusCode === statusCodes.badRequest && isReference) {
    return errorContext(invalidReferenceMessage(), { onField: true })
  }
  if (statusCode === statusCodes.forbidden) {
    return errorContext(FORBIDDEN_MESSAGE)
  }
  return errorContext(UNAVAILABLE_MESSAGE)
}

const handleApiError = (err, request, h, { search, isReference }) =>
  backendErrorResponse(err, request, h, {
    label: 'Search',
    render: (statusCode) =>
      h.view(VIEW, {
        ...pageContext(search),
        ...apiErrorContext(statusCode, isReference)
      })
  })

// Search the register (Search API). No term in the query is the initial visit,
// so only the form is shown.
export const searchController = {
  async handler(request, h) {
    const { [SEARCH_FIELD]: search, page } = request.query

    if (search === undefined) {
      return h.view(VIEW, pageContext())
    }

    try {
      const token = getForwardedToken(request)
      const { operators, pagination } = await searchRegister({
        query: search,
        page,
        token
      })

      const { totalPages, totalRecords } = pagination

      if (totalPages > 0 && page > totalPages) {
        return h.redirect(pageHref(search, totalPages))
      }

      return h.view(VIEW, {
        ...pageContext(search),
        ...(totalPages > 1 && {
          pageTitle: `${app.pageTitle} (page ${page} of ${totalPages})`
        }),
        operators,
        resultRows: buildResultRows(operators),
        totalRecords,
        pagination: buildPagination(search, pagination)
      })
    } catch (err) {
      return handleApiError(err, request, h, { search, isReference: false })
    }
  }
}

// Export one registration as CSV (Export API), linked from each result card.
// The backend builds the CSV; this forwards the officer's token and passes the
// file through. A value that isn't a reference shows the format error on the
// search page, as does any API error.
export const exportController = {
  async handler(request, h) {
    const search = request.query.reference
    const reference = toReference(search)

    if (!reference) {
      return h.view(VIEW, {
        ...pageContext(search),
        ...errorContext(invalidReferenceMessage(), { onField: true })
      })
    }

    try {
      const csv = await fetchExport(reference, getForwardedToken(request))

      return h
        .response(csv)
        .type('text/csv; charset=utf-8')
        .header(
          'content-disposition',
          `attachment; filename="ocr-registration-${reference}.csv"`
        )
    } catch (err) {
      return handleApiError(err, request, h, { search, isReference: true })
    }
  }
}
