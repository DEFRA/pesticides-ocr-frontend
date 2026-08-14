import { searchOperators, toCsv } from './operators-data.js'

// Grid + search (Dashboard API + Search API).
export const operatorsController = {
  async handler(request, h) {
    const search = (request.query.search ?? '').toString()
    const operators = await searchOperators({ query: search })

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
    const search = (request.query.search ?? '').toString()
    const operators = await searchOperators({ query: search })

    return h
      .response(toCsv(operators))
      .type('text/csv')
      .header(
        'content-disposition',
        'attachment; filename="ocr-registered-operators.csv"'
      )
  }
}
