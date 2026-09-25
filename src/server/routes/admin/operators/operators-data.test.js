import { describe, test, expect, vi, afterEach } from 'vitest'

import { config } from '#/config/config.js'
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

// The default mode in the test env is 'mock', so the describe blocks below
// exercise the built-in sample data. The 'live mode' block flips the mode and
// asserts delegation to the backend client instead.

describe('#searchOperators', () => {
  test('returns all operators when the query is blank', async () => {
    const all = await searchOperators()
    const blank = await searchOperators({ query: '   ' })
    expect(all.length).toBeGreaterThan(1)
    expect(blank.length).toBe(all.length)
  })

  test('filters case-insensitively by business name', async () => {
    const result = await searchOperators({ query: 'green acres' })
    expect(result).toHaveLength(1)
    expect(result[0].businessName).toBe('Green Acres Growers')
  })

  test('filters by postcode and reference too', async () => {
    expect(await searchOperators({ query: 'PH1 1FT' })).toHaveLength(1)
    expect(
      (await searchOperators({ query: 'OCR-2026-000103' }))[0].businessName
    ).toBe('Coastal Crop Supplies')
  })

  test('returns an empty array when nothing matches', async () => {
    expect(await searchOperators({ query: 'no-such-operator' })).toEqual([])
  })
})

describe('#getOperatorById', () => {
  test('returns the matching operator', async () => {
    const op = await getOperatorById('OCR-2026-000101')
    expect(op.businessName).toBe('Pesticides Ltd')
  })

  test('returns null when not found', async () => {
    expect(await getOperatorById('OCR-0000-000000')).toBeNull()
  })
})

describe('#toCsv', () => {
  test('renders a header row plus one row per operator, comma-separated and quoted', async () => {
    const operators = await searchOperators({ query: 'green acres' })
    const csv = toCsv(operators)
    const lines = csv.split('\r\n')

    expect(lines[0]).toContain('"Reference"')
    expect(lines[0]).toContain('"Business name"')
    expect(lines).toHaveLength(2) // header + 1 operator
    expect(lines[1]).toContain('"Green Acres Growers"')
    expect(lines[1]).toContain('"Use"') // activities joined
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

describe('live mode delegates to the backend client', () => {
  const originalMode = config.get('entra.mode')

  afterEach(() => {
    config.set('entra.mode', originalMode)
    vi.clearAllMocks()
  })

  // The backend now returns stored registrations, so this layer maps them onto
  // the Operator shape the grid and the CSV expect.
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

  test('searchOperators forwards the query + token to fetchOperators', async () => {
    config.set('entra.mode', 'live')
    vi.mocked(fetchOperators).mockResolvedValue([storedRegistration])

    await searchOperators({ query: 'live', token: 'tok' })

    expect(fetchOperators).toHaveBeenCalledWith({ query: 'live', token: 'tok' })
  })

  test('searchOperators maps stored registrations onto the Operator shape', async () => {
    config.set('entra.mode', 'live')
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
    config.set('entra.mode', 'live')
    vi.mocked(fetchOperatorByReference).mockResolvedValue(storedRegistration)

    const result = await getOperatorById('OCR-9', 'tok')

    expect(result.reference).toBe('OCR-9')
    expect(result.activities).toEqual(['Manufacture, process or import'])
    expect(fetchOperatorByReference).toHaveBeenCalledWith('OCR-9', 'tok')
  })

  test('getOperatorById keeps a not-found null rather than mapping it', async () => {
    config.set('entra.mode', 'live')
    vi.mocked(fetchOperatorByReference).mockResolvedValue(null)

    expect(await getOperatorById('OCR-nope', 'tok')).toBeNull()
  })
})
