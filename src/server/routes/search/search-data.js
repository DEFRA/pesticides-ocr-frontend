// Register data for the case-officer search (EQ-227) — the seam between the
// search page and the OCR backend.
//
// Delegates to the pesticides-ocr-backend search API (EQ-366) via
// ./search-client.js, forwarding the case officer's token (EQ-442), then maps
// the stored registrations it returns onto the Operator shape via
// ./registration-mapper.js, so the page only sees that shape.

import { fetchSearchResults, fetchByReference } from './search-client.js'
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
 * Free-text search of the register (business name, contact, town, postcode,
 * reference). A blank query returns every registration. `token` is forwarded
 * to the backend.
 * @param {{ query?: string, token?: string }} [options]
 * @returns {Promise<Operator[]>}
 */
export async function searchRegister({ query = '', token = '' } = {}) {
  const registrations = await fetchSearchResults({ query, token })
  return registrations.map(toOperatorView)
}

/**
 * Look up a single registration by reference. `token` is forwarded to the
 * backend.
 * @param {string} reference
 * @param {string} [token]
 * @returns {Promise<Operator | null>}
 */
export async function getByReference(reference, token = '') {
  const registration = await fetchByReference(reference, token)
  return registration ? toOperatorView(registration) : null
}
