// Operator-data access for the admin/enforcement UI (EQ-227) — the single seam
// between the admin UI and the OCR backend.
//
// Delegates to the pesticides-ocr-backend search API (EQ-366) via
// ./operators-client.js, forwarding the case officer's Entra token (EQ-442),
// then maps the stored registrations it returns onto the Operator shape via
// ./registration-mapper.js, so the routes, views and CSV export only see that
// shape.
//
// Maps to Arin's wireframe: Search API (searchOperators query), Dashboard API
// (the grid rows), Export API (toCsv).

import {
  fetchOperators,
  fetchOperatorByReference
} from './operators-client.js'
import { toOperatorView } from './registration-mapper.js'

/**
 * A registered operator (organisation).
 * @typedef {object} Operator
 * @property {string} reference          registration reference (e.g. PPP-1A2-B3C)
 * @property {string} businessName
 * @property {string[]} activities       business PPP activities
 * @property {string} mainCustomer
 * @property {{ line1: string, town: string, postcode: string, country: string }} address
 * @property {{ name: string, email: string, telephone: string }} contact
 * @property {string[]} addressActivities
 * @property {string} quantity
 * @property {string} registeredDate     ISO date (yyyy-mm-dd)
 * @property {string} status             'Registered' | 'Pending' | 'Suspended'
 */

/**
 * Search/list operators (Search API + Dashboard API). A blank query returns all
 * operators. `token` is forwarded to the backend.
 * @param {{ query?: string, token?: string }} [options]
 * @returns {Promise<Operator[]>}
 */
export async function searchOperators({ query = '', token = '' } = {}) {
  const registrations = await fetchOperators({ query, token })
  return registrations.map(toOperatorView)
}

/**
 * Fetch a single operator by registration reference (the search page). `token`
 * is forwarded to the backend.
 * @param {string} reference
 * @param {string} [token]
 * @returns {Promise<Operator | null>}
 */
export async function getOperatorById(reference, token = '') {
  const registration = await fetchOperatorByReference(reference, token)
  return registration ? toOperatorView(registration) : null
}

// Getters are null-safe so real backend data with a missing contact/address/
// activities can't 500 the export (the grid tolerates gaps; the CSV must too).
const CSV_COLUMNS = [
  ['Reference', (op) => op.reference],
  ['Business name', (op) => op.businessName],
  ['Registered date', (op) => op.registeredDate],
  ['Activities', (op) => (op.activities ?? []).join('; ')],
  ['Main customer', (op) => op.mainCustomer],
  ['Contact name', (op) => op.contact?.name],
  ['Email', (op) => op.contact?.email],
  ['Telephone', (op) => op.contact?.telephone],
  ['Town', (op) => op.address?.town],
  ['Postcode', (op) => op.address?.postcode],
  ['Country', (op) => op.address?.country],
  ['Status', (op) => op.status]
]

// Formula-injection prefixes: a cell starting with any of these is treated as a
// formula by Excel/Sheets. Prefix such values with a single quote so they render
// as text — matters once operator-supplied names flow through this seam.
const CSV_FORMULA_PREFIXES = /^[=+\-@\t\r]/

// Quote a CSV field (RFC 4180), escape embedded quotes, and neutralise formula
// injection.
const csvCell = (value) => {
  const raw = String(value ?? '')
  const safe = CSV_FORMULA_PREFIXES.test(raw) ? `'${raw}` : raw
  return `"${safe.replaceAll('"', '""')}"`
}

/**
 * Render operators as CSV (Export API). CSV opens directly in Excel; a true
 * .xlsx can replace this later if HSE require native formatting.
 * @param {Operator[]} operators
 * @returns {string}
 */
export function toCsv(operators) {
  const header = CSV_COLUMNS.map(([name]) => csvCell(name)).join(',')
  const rows = operators.map((op) =>
    CSV_COLUMNS.map(([, get]) => csvCell(get(op))).join(',')
  )
  return [header, ...rows].join('\r\n')
}
