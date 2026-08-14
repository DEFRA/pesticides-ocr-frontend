// Stubbed operator-data access for the admin/enforcement UI (EQ-227).
//
// This is the single seam between the admin UI and the OCR backend. The backend
// operator API does not exist yet (pesticides-ocr-backend is still the CDP
// scaffold), so this module returns mock data with a fixed contract. When the
// backend endpoints land, replace the bodies of `searchOperators` /
// `getOperatorById` / `toCsv` inputs with real calls — the contract (the
// Operator shape + these function signatures) stays the same, so the routes,
// views and tests don't change.
//
// Maps to Arin's wireframe: Search API (searchOperators query), Dashboard API
// (the grid rows), Export API (toCsv).

/**
 * A registered operator (organisation), as shown in the admin grid.
 * @typedef {object} Operator
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

/** @type {Operator[]} */
const OPERATORS = [
  {
    reference: 'OCR-2026-000101',
    businessName: 'Pesticides Ltd',
    activities: ['Manufacture', 'Distribute', 'Sell'],
    mainCustomer: 'Professional and amateur sellers',
    address: {
      line1: 'Highfield Farm',
      town: 'Farmtown',
      postcode: 'PH1 1FT',
      country: 'England'
    },
    contact: {
      name: 'John Smith',
      email: 'john.smith@pesticides.co.uk',
      telephone: '01234 567890'
    },
    addressActivities: ['Use PPPs', 'Store PPPs'],
    quantity: '80,000 Kgs',
    registeredDate: '2026-03-11',
    status: 'Registered'
  },
  {
    reference: 'OCR-2026-000102',
    businessName: 'Green Acres Growers',
    activities: ['Use'],
    mainCustomer: 'N/A',
    address: {
      line1: '2 Meadow Lane',
      town: 'Cropwell',
      postcode: 'NG12 3AB',
      country: 'England'
    },
    contact: {
      name: 'Priya Patel',
      email: 'priya@greenacres.example',
      telephone: '0115 900 1234'
    },
    addressActivities: ['Use PPPs'],
    quantity: '3,200 litres',
    registeredDate: '2026-05-02',
    status: 'Registered'
  },
  {
    reference: 'OCR-2026-000103',
    businessName: 'Coastal Crop Supplies',
    activities: ['Place on the market', 'Sell'],
    mainCustomer: 'Professional users',
    address: {
      line1: 'Unit 7, Dock Road',
      town: 'Port Haven',
      postcode: 'SA1 9ZZ',
      country: 'Wales'
    },
    contact: {
      name: 'Dylan Rhys',
      email: 'dylan@coastalcrop.example',
      telephone: '01792 555 010'
    },
    addressActivities: ['Store PPPs', 'Keep records'],
    quantity: '12,000 Kgs',
    registeredDate: '2026-06-20',
    status: 'Pending'
  },
  {
    reference: 'OCR-2026-000104',
    businessName: 'Highland Forestry Co',
    activities: ['Use'],
    mainCustomer: 'N/A',
    address: {
      line1: 'Glen Estate',
      town: 'Aviemore',
      postcode: 'PH22 1QD',
      country: 'Scotland'
    },
    contact: {
      name: 'Fiona MacLeod',
      email: 'fiona@highlandforestry.example',
      telephone: '01479 555 200'
    },
    addressActivities: ['Use PPPs'],
    quantity: '900 litres',
    registeredDate: '2026-01-30',
    status: 'Suspended'
  },
  {
    reference: 'OCR-2026-000105',
    businessName: 'Amateur Garden Store',
    activities: ['Sell amateur'],
    mainCustomer: 'Amateur users',
    address: {
      line1: '14 High Street',
      town: 'Marketon',
      postcode: 'LN2 4CD',
      country: 'England'
    },
    contact: {
      name: 'Sam Taylor',
      email: 'sam@gardenstore.example',
      telephone: '01522 555 300'
    },
    addressActivities: ['Store PPPs'],
    quantity: '450 Kgs',
    registeredDate: '2026-07-14',
    status: 'Registered'
  }
]

const includesCi = (haystack, needle) =>
  String(haystack).toLowerCase().includes(needle)

/**
 * Search/list operators for the grid (Search API + Dashboard API).
 * A blank query returns all operators.
 * @param {{ query?: string }} [options]
 * @returns {Promise<Operator[]>}
 */
export async function searchOperators({ query = '' } = {}) {
  const q = query.trim().toLowerCase()
  if (!q) {
    return OPERATORS
  }
  return OPERATORS.filter(
    (op) =>
      includesCi(op.reference, q) ||
      includesCi(op.businessName, q) ||
      includesCi(op.contact.name, q) ||
      includesCi(op.address.postcode, q) ||
      includesCi(op.address.town, q)
  )
}

/**
 * Fetch a single operator by registration reference (for the detail view — a
 * later slice).
 * @param {string} reference
 * @returns {Promise<Operator | null>}
 */
export async function getOperatorById(reference) {
  return OPERATORS.find((op) => op.reference === reference) ?? null
}

const CSV_COLUMNS = [
  ['Reference', (op) => op.reference],
  ['Business name', (op) => op.businessName],
  ['Registered date', (op) => op.registeredDate],
  ['Activities', (op) => op.activities.join('; ')],
  ['Main customer', (op) => op.mainCustomer],
  ['Contact name', (op) => op.contact.name],
  ['Email', (op) => op.contact.email],
  ['Telephone', (op) => op.contact.telephone],
  ['Town', (op) => op.address.town],
  ['Postcode', (op) => op.address.postcode],
  ['Country', (op) => op.address.country],
  ['Status', (op) => op.status]
]

// Quote a CSV field and escape embedded quotes (RFC 4180).
const csvCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`

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
