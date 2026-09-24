// Maps stored registration documents onto the Operator contract the admin grid
// renders (EQ-227, EQ-385).
//
// This used to live in the backend. It moved here when the backend's /operators
// API was folded into /search (EQ-366): search returns registrations as stored,
// and turning them into display text — labels, defaults, formatting — is a
// presentation concern, so it belongs on this side of the seam. That also keeps
// display strings out of an API other consumers share.

import { businessActivityItems } from '#/server/routes/qualifying-questions/business-activities/items.js'
import { addressActivityItems } from '#/server/routes/qualifying-questions/address-activity/items.js'
import { mainCustomerItems } from '#/server/routes/qualifying-questions/main-customer/items.js'
import { quantityTypeItems } from '#/server/routes/qualifying-questions/quantity/items.js'

// --- POC mapping defaults --------------------------------------------------
// Fields the Operator contract needs but the register journey does not (yet)
// persist. These are the EQ-385 "data-model mapping" open decisions — confirm
// with HSE/Yankui before production. Isolated here so a decision changes one
// place.
//   - status:       no approval/status workflow exists; treated as Registered.
//   - country:      the register journey captures postcode/county but not a
//                   country; left blank until the field is added.
//   - mainCustomer: the backend now requires and stores this, so the fallback
//                   only covers records written before the field was added.
const DEFAULT_STATUS = 'Registered'
const DEFAULT_COUNTRY = ''
const DEFAULT_MAIN_CUSTOMER = 'N/A'

const ISO_DATE_LENGTH = 10

// Coded value -> display label, taken from the journey's own option lists so the
// grid shows exactly what the applicant was asked and can't drift from it.
// Stored values are the register-form codes; unknown codes fall back to the raw
// value.
const labelsByValue = (items) =>
  Object.fromEntries(items.map(({ value, text }) => [value, text]))

const BUSINESS_ACTIVITY_LABELS = labelsByValue(businessActivityItems)
const ADDRESS_ACTIVITY_LABELS = labelsByValue(addressActivityItems)
const MAIN_CUSTOMER_LABELS = labelsByValue(mainCustomerItems)

const QUANTITY_UNITS = Object.fromEntries(
  quantityTypeItems.map(({ value, unit }) => [value, unit])
)

const labelFor = (map) => (code) => map[code] ?? code

// A quantity may be stored as a number (the backend's /register validation
// converts it) or as a numeric string (records written straight to the
// database, such as the seed data). Strings must be plain decimals, so forms
// Number() would otherwise accept, like '0x10' or '1e3', don't slip through.
// Anything else is treated as absent.
const DECIMAL_PATTERN = /^\s*\d+(\.\d+)?\s*$/

function toQuantityNumber(value) {
  const number =
    typeof value === 'string' && DECIMAL_PATTERN.test(value)
      ? Number(value)
      : value
  return typeof number === 'number' && Number.isFinite(number) ? number : null
}

// Format the structured stored quantity into the grid's display string, using
// the journey's unit for the quantity type (amount -> "litres or kilograms",
// area -> "hectares"). An unrecognised type falls back to the amount unit.
function formatQuantity(quantity) {
  const amount = toQuantityNumber(quantity?.quantity)
  if (amount === null) {
    return ''
  }
  const unit = QUANTITY_UNITS[quantity.quantityType] ?? QUANTITY_UNITS.amount
  return `${amount.toLocaleString('en-GB')} ${unit}`
}

// `submittedAt` (a Date, or its JSON string over the wire) -> yyyy-mm-dd,
// matching the contract's registeredDate.
function toIsoDate(value) {
  const date = value ? new Date(value) : null
  return date && !Number.isNaN(date.getTime())
    ? date.toISOString().slice(0, ISO_DATE_LENGTH)
    : ''
}

// The Operator contract carries only line1/town/postcode/country; the stored
// address.line2/county are intentionally dropped (not shown on the grid).
function mapAddress(address = {}) {
  return {
    line1: address.addressLine1 ?? '',
    town: address.addressTown ?? '',
    postcode: address.addressPostcode ?? '',
    country: address.addressCountry ?? DEFAULT_COUNTRY
  }
}

function mapContact(contact = {}) {
  return {
    name: contact.contactName ?? '',
    email: contact.contactEmail ?? '',
    telephone: contact.contactTelephone ?? ''
  }
}

/**
 * Map a stored registration onto the Operator contract.
 *
 * Stored fields with no place in the contract are intentionally omitted:
 * address.line2/county (see mapAddress), and additionalAddresses /
 * professionalSectors / memberSchemes — see the EQ-385 data-model decision.
 *
 * @param {object} doc stored registration, as returned by the backend /search
 * @returns {import('./operators-data.js').Operator}
 */
export function toOperatorView(doc = {}) {
  return {
    reference: doc.reference ?? '',
    businessName: doc.businessName ?? '',
    activities: (doc.businessActivities ?? []).map(
      labelFor(BUSINESS_ACTIVITY_LABELS)
    ),
    mainCustomer: doc.mainCustomer
      ? labelFor(MAIN_CUSTOMER_LABELS)(doc.mainCustomer)
      : DEFAULT_MAIN_CUSTOMER,
    address: mapAddress(doc.address),
    contact: mapContact(doc.primaryContact),
    addressActivities: (doc.addressActivities ?? []).map(
      labelFor(ADDRESS_ACTIVITY_LABELS)
    ),
    quantity: formatQuantity(doc.quantity),
    registeredDate: toIsoDate(doc.submittedAt),
    status: doc.status ?? DEFAULT_STATUS
  }
}
