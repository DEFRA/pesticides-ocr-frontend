// Register data for the case-officer search (EQ-227) — the seam between the
// search page and the OCR backend.
//
// Delegates to the pesticides-ocr-backend search API (EQ-366) via
// ./search-client.js, forwarding the case officer's token (EQ-442), then maps
// the stored registrations it returns onto the Operator shape via
// ./registration-mapper.js, so the page only sees that shape.

import { fetchSearchResults } from './search-client.js'
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
 * Search the register a page at a time. `token` is forwarded to the backend.
 * @param {{ query: string, page?: number, token?: string }} options
 * @returns {Promise<{ operators: Operator[], pagination: object }>}
 */
export async function searchRegister({ query, page = 1, token = '' }) {
  const { data, pagination } = await fetchSearchResults({ query, page, token })
  return { operators: data.map(toOperatorView), pagination }
}
