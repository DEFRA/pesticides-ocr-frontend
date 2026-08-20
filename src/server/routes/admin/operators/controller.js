import { searchOperators, toCsv } from './operators-data.js'

// Resolve the current (optionally filtered) operators view from the request —
// shared by the grid and the export so the two stay in lockstep.
async function getFilteredOperators(request) {
  const search = (request.query.search ?? '').toString()
  const operators = await searchOperators({ query: search })
  return { search, operators }
}

// Grid + search (Dashboard API + Search API).
export const operatorsController = {
  async handler(request, h) {
    const { search, operators } = await getFilteredOperators(request)

    return h.view('admin/operators/index', {
      operators,
      search,
      total: operators.length
    })
  }
}

// Export to Excel (Export API) — CSV download of the current (filtered) view.
export const operatorsExportController = {
  async handler(request, h) {
    const { operators } = await getFilteredOperators(request)

    return h
      .response(toCsv(operators))
      .type('text/csv')
      .header(
        'content-disposition',
        'attachment; filename="ocr-registered-operators.csv"'
      )
  }
}
