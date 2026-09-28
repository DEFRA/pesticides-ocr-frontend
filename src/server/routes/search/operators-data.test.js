import { describe, test, expect, vi, afterEach } from 'vitest'

import {
  searchOperators,
  getOperatorById,
  toCsv
} from './operators-data.js'
import {
  fetchOperators,
  fetchOperatorByReference
} from './operators-client.js'

vi.mock('./operators-client.js', () => ({
  fetchOperators: vi.fn(),
  fetchOperatorByReference: vi.fn()
}))

// The backend returns stored registrations, so this layer maps them onto the
// Operator shape the views and the CSV expect.
const storedRegistration = {
  reference: 'OCR-9',
  businessName: 'Live Co',
  businessActivities: ['manufacture'],
  address: {
    addressLine1: 'Farm',
    addressTown: 'Town',
    addressPostcode: 'P1'
  },
  primaryContact: { contactName: 'Jo', contactEmail: 'jo@x.test' },
  submittedAt: '2026-03-11T09:30:00.000Z'
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('#toCsv', () => {
  test('renders a header row plus one row per operator, comma-separated and quoted', async () => {
    vi.mocked(fetchOperators).mockResolvedValue([storedRegistration])
    const operators = await searchOperators({ query: 'live', token: 'tok' })
    const csv = toCsv(operators)
    const lines = csv.split('\r\n')

    expect(lines[0]).toContain('"Reference"')
    expect(lines[0]).toContain('"Business name"')
    expect(lines).toHaveLength(2) // header + 1 operator
    expect(lines[1]).toContain('"Live Co"')
    expect(lines[1]).toContain('"Manufacture, process or import"') // activities joined
  })

  test('escapes embedded double quotes', () => {
    const csv = toCsv([
      {
        reference: 'X',
        businessName: 'A "B" C',
        activities: [],
        mainCustomer: '',
        address: { line1: '', town: '', postcode: '', country: '' },
        contact: { name: '', email: '', telephone: '' },
        addressActivities: [],
        quantity: '',
        registeredDate: '',
        status: ''
      }
    ])
    expect(csv).toContain('"A ""B"" C"')
  })

  test('neutralises spreadsheet formula injection with a leading quote', () => {
    const csv = toCsv([
      {
        reference: 'X',
        businessName: '=HYPERLINK("http://evil.example","x")',
        activities: [],
        mainCustomer: '',
        address: { town: '', postcode: '', country: '' },
        contact: { name: '', email: '', telephone: '' },
        addressActivities: [],
        quantity: '',
        registeredDate: '',
        status: ''
      }
    ])
    // Prefixed with ' so Excel/Sheets treats it as text, not a formula.
    expect(csv).toContain('"\'=HYPERLINK(')
  })

  test('does not throw when contact/address/activities are missing', () => {
    expect(() =>
      toCsv([{ reference: 'X', businessName: 'No nested fields' }])
    ).not.toThrow()
  })
})

describe('delegates to the backend client', () => {
  test('searchOperators forwards the query + token to fetchOperators', async () => {
    vi.mocked(fetchOperators).mockResolvedValue([storedRegistration])

    await searchOperators({ query: 'live', token: 'tok' })

    expect(fetchOperators).toHaveBeenCalledWith({ query: 'live', token: 'tok' })
  })

  test('searchOperators maps stored registrations onto the Operator shape', async () => {
    vi.mocked(fetchOperators).mockResolvedValue([storedRegistration])

    const [operator] = await searchOperators({ query: 'live', token: 'tok' })

    expect(operator.businessName).toBe('Live Co')
    // Coded slugs become display labels, and the nested stored names flatten.
    expect(operator.activities).toEqual(['Manufacture, process or import'])
    expect(operator.contact.name).toBe('Jo')
    expect(operator.address.town).toBe('Town')
    expect(operator.registeredDate).toBe('2026-03-11')
    // Fields the register journey does not persist get their POC defaults.
    expect(operator.status).toBe('Registered')
  })

  test('getOperatorById forwards the reference + token to fetchOperatorByReference', async () => {
    vi.mocked(fetchOperatorByReference).mockResolvedValue(storedRegistration)

    const result = await getOperatorById('OCR-9', 'tok')

    expect(result.reference).toBe('OCR-9')
    expect(result.activities).toEqual(['Manufacture, process or import'])
    expect(fetchOperatorByReference).toHaveBeenCalledWith('OCR-9', 'tok')
  })

  test('getOperatorById keeps a not-found null rather than mapping it', async () => {
    vi.mocked(fetchOperatorByReference).mockResolvedValue(null)

    expect(await getOperatorById('OCR-nope', 'tok')).toBeNull()
  })
})
