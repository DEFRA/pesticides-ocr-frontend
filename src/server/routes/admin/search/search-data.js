// Registration data for the admin search UI (EQ-227), the single seam between
// it and the OCR backend. LIVE mode calls the backend search API via
// ./search-client.js with the case officer's Entra token and maps the stored
// registrations with ./registration-mapper.js; MOCK mode (local demo / UCD)
// returns the sample data below, already in that shape. Callers get the same
// RegistrationView shape either way.

import { config } from '#/config/config.js'

import {
  fetchSearchResults,
  fetchRegistrationByReference
} from './search-client.js'
import { toRegistrationView } from './registration-mapper.js'

// Live mode calls the real backend; mock mode uses the sample data below.
function isLiveMode() {
  return config.get('entra.mode') === 'live'
}

/**
 * A registration as shown in the admin grid.
 * @typedef {object} RegistrationView
 * @property {string} reference          registration reference (e.g. OCR-2026-000123)
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

// Controlled vocabularies for the mock records (the real backend will supply
// these values; naming them keeps the data consistent and avoids repeated literals).
const STATUS = { REGISTERED: 'Registered', PENDING: 'Pending', SUSPENDED: 'Suspended' }
const ACTIVITY = { USE: 'Use PPPs', STORE: 'Store PPPs', RECORDS: 'Keep records' }
const COUNTRY = { ENGLAND: 'England', WALES: 'Wales', SCOTLAND: 'Scotland' }

// Build a RegistrationView from a compact row so the shape is declared once,
// not per record.
const toMockRegistration = ([
  reference,
  businessName,
  activities,
  mainCustomer,
  [line1, town, postcode, country],
  [name, email, telephone],
  addressActivities,
  quantity,
  registeredDate,
  status
]) => ({
  reference,
  businessName,
  activities,
  mainCustomer,
  address: { line1, town, postcode, country },
  contact: { name, email, telephone },
  addressActivities,
  quantity,
  registeredDate,
  status
})

/** @type {RegistrationView[]} */
const MOCK_REGISTRATIONS = [
  [
    'OCR-2026-000101',
    'Pesticides Ltd',
    ['Manufacture', 'Distribute', 'Sell'],
    'Professional and amateur sellers',
    ['Highfield Farm', 'Farmtown', 'PH1 1FT', COUNTRY.ENGLAND],
    ['John Smith', 'john.smith@pesticides.co.uk', '01234 567890'],
    [ACTIVITY.USE, ACTIVITY.STORE],
    '80,000 Kgs',
    '2026-03-11',
    STATUS.REGISTERED
  ],
  [
    'OCR-2026-000102',
    'Green Acres Growers',
    ['Use'],
    'N/A',
    ['2 Meadow Lane', 'Cropwell', 'NG12 3AB', COUNTRY.ENGLAND],
    ['Priya Patel', 'priya@greenacres.example', '0115 900 1234'],
    [ACTIVITY.USE],
    '3,200 litres',
    '2026-05-02',
    STATUS.REGISTERED
  ],
  [
    'OCR-2026-000103',
    'Coastal Crop Supplies',
    ['Place on the market', 'Sell'],
    'Professional users',
    ['Unit 7, Dock Road', 'Port Haven', 'SA1 9ZZ', COUNTRY.WALES],
    ['Dylan Rhys', 'dylan@coastalcrop.example', '01792 555 010'],
    [ACTIVITY.STORE, ACTIVITY.RECORDS],
    '12,000 Kgs',
    '2026-06-20',
    STATUS.PENDING
  ],
  [
    'OCR-2026-000104',
    'Highland Forestry Co',
    ['Use'],
    'N/A',
    ['Glen Estate', 'Aviemore', 'PH22 1QD', COUNTRY.SCOTLAND],
    ['Fiona MacLeod', 'fiona@highlandforestry.example', '01479 555 200'],
    [ACTIVITY.USE],
    '900 litres',
    '2026-01-30',
    STATUS.SUSPENDED
  ],
  [
    'OCR-2026-000105',
    'Amateur Garden Store',
    ['Sell amateur'],
    'Amateur users',
    ['14 High Street', 'Marketon', 'LN2 4CD', COUNTRY.ENGLAND],
    ['Sam Taylor', 'sam@gardenstore.example', '01522 555 300'],
    [ACTIVITY.STORE],
    '450 Kgs',
    '2026-07-14',
    STATUS.REGISTERED
  ]
].map(toMockRegistration)

const includesCi = (haystack, needle) =>
  String(haystack).toLowerCase().includes(needle)

// Mock-mode filter over the sample data (blank query returns all).
function searchMockRegistrations(query) {
  const q = query.trim().toLowerCase()
  if (!q) {
    return MOCK_REGISTRATIONS
  }
  return MOCK_REGISTRATIONS.filter(
    (op) =>
      includesCi(op.reference, q) ||
      includesCi(op.businessName, q) ||
      includesCi(op.contact.name, q) ||
      includesCi(op.address.postcode, q) ||
      includesCi(op.address.town, q)
  )
}

/**
 * Search/list registrations for the grid. A blank query returns all of them.
 * In live mode `token` is forwarded to the backend; in mock mode it is ignored.
 * @param {{ query?: string, token?: string }} [options]
 * @returns {Promise<RegistrationView[]>}
 */
export async function searchRegistrations({ query = '', token = '' } = {}) {
  if (isLiveMode()) {
    const registrations = await fetchSearchResults({ query, token })
    return registrations.map(toRegistrationView)
  }
  return searchMockRegistrations(query)
}

/**
 * Fetch a single registration by reference (for the detail view — a
 * later slice). In live mode `token` is forwarded to the backend; in mock mode
 * it is ignored.
 * @param {string} reference
 * @param {string} [token]
 * @returns {Promise<RegistrationView | null>}
 */
export async function getRegistrationByReference(reference, token = '') {
  if (isLiveMode()) {
    const registration = await fetchRegistrationByReference(reference, token)
    return registration ? toRegistrationView(registration) : null
  }
  return MOCK_REGISTRATIONS.find((op) => op.reference === reference) ?? null
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
// as text — matters because applicant-supplied names flow through this seam.
const CSV_FORMULA_PREFIXES = /^[=+\-@\t\r]/

// Quote a CSV field (RFC 4180), escape embedded quotes, and neutralise formula
// injection.
const csvCell = (value) => {
  const raw = String(value ?? '')
  const safe = CSV_FORMULA_PREFIXES.test(raw) ? `'${raw}` : raw
  return `"${safe.replaceAll('"', '""')}"`
}

/**
 * Render registrations as CSV. CSV opens directly in Excel; a true
 * .xlsx can replace this later if HSE require native formatting.
 * @param {RegistrationView[]} registrations
 * @returns {string}
 */
export function toCsv(registrations) {
  const header = CSV_COLUMNS.map(([name]) => csvCell(name)).join(',')
  const rows = registrations.map((op) =>
    CSV_COLUMNS.map(([, get]) => csvCell(get(op))).join(',')
  )
  return [header, ...rows].join('\r\n')
}
