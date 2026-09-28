import { describe, test, expect, vi, afterEach } from 'vitest'

import { config } from '#/config/config.js'
import {
  searchRegistrations,
  getRegistrationByReference,
  toCsv
} from './search-data.js'
import {
  fetchSearchResults,
  fetchRegistrationByReference
} from './search-client.js'

vi.mock('./search-client.js', () => ({
  fetchSearchResults: vi.fn(),
  fetchRegistrationByReference: vi.fn()
}))

// The default mode in the test env is 'mock', so the describe blocks below
// exercise the built-in sample data. The 'live mode' block flips the mode and
// asserts delegation to the backend client instead.

describe('#searchRegistrations', () => {
  test('returns all registrations when the query is blank', async () => {
    const all = await searchRegistrations()
    const blank = await searchRegistrations({ query: '   ' })
    expect(all.length).toBeGreaterThan(1)
    expect(blank.length).toBe(all.length)
  })

  test('filters case-insensitively by business name', async () => {
    const result = await searchRegistrations({ query: 'green acres' })
    expect(result).toHaveLength(1)
    expect(result[0].businessName).toBe('Green Acres Growers')
  })

  test('filters by postcode and reference too', async () => {
    expect(await searchRegistrations({ query: 'PH1 1FT' })).toHaveLength(1)
    expect(
      (await searchRegistrations({ query: 'OCR-2026-000103' }))[0].businessName
    ).toBe('Coastal Crop Supplies')
  })

  test('returns an empty array when nothing matches', async () => {
    expect(await searchRegistrations({ query: 'no-such-registration' })).toEqual([])
  })
})

describe('#getRegistrationByReference', () => {
  test('returns the matching registration', async () => {
    const op = await getRegistrationByReference('OCR-2026-000101')
    expect(op.businessName).toBe('Pesticides Ltd')
  })

  test('returns null when not found', async () => {
    expect(await getRegistrationByReference('OCR-0000-000000')).toBeNull()
  })
})

describe('#toCsv', () => {
  test('renders a header row plus one row per registration, comma-separated and quoted', async () => {
    const registrations = await searchRegistrations({ query: 'green acres' })
    const csv = toCsv(registrations)
    const lines = csv.split('\r\n')

    expect(lines[0]).toContain('"Reference"')
    expect(lines[0]).toContain('"Business name"')
    expect(lines).toHaveLength(2) // header + 1 registration
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

  // Stored registrations from the backend are mapped onto the RegistrationView
  // the grid and the CSV expect.
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

  test('searchRegistrations forwards the query + token to fetchSearchResults', async () => {
    config.set('entra.mode', 'live')
    vi.mocked(fetchSearchResults).mockResolvedValue([storedRegistration])

    await searchRegistrations({ query: 'live', token: 'tok' })

    expect(fetchSearchResults).toHaveBeenCalledWith({ query: 'live', token: 'tok' })
  })

  test('searchRegistrations maps stored registrations onto a RegistrationView', async () => {
    config.set('entra.mode', 'live')
    vi.mocked(fetchSearchResults).mockResolvedValue([storedRegistration])

    const [view] = await searchRegistrations({ query: 'live', token: 'tok' })

    expect(view.businessName).toBe('Live Co')
    // Coded slugs become display labels, and the nested stored names flatten.
    expect(view.activities).toEqual(['Manufacture, process or import'])
    expect(view.contact.name).toBe('Jo')
    expect(view.address.town).toBe('Town')
    expect(view.registeredDate).toBe('2026-03-11')
    // Fields the register journey does not persist get their POC defaults.
    expect(view.status).toBe('Registered')
  })

  test('getRegistrationByReference forwards the reference + token to fetchRegistrationByReference', async () => {
    config.set('entra.mode', 'live')
    vi.mocked(fetchRegistrationByReference).mockResolvedValue(storedRegistration)

    const result = await getRegistrationByReference('OCR-9', 'tok')

    expect(result.reference).toBe('OCR-9')
    expect(result.activities).toEqual(['Manufacture, process or import'])
    expect(fetchRegistrationByReference).toHaveBeenCalledWith('OCR-9', 'tok')
  })

  test('getRegistrationByReference keeps a not-found null rather than mapping it', async () => {
    config.set('entra.mode', 'live')
    vi.mocked(fetchRegistrationByReference).mockResolvedValue(null)

    expect(await getRegistrationByReference('OCR-nope', 'tok')).toBeNull()
  })
})
