import { describe, test, expect, vi, afterEach } from 'vitest'

import { searchRegister, getByReference } from './search-data.js'
import {
  fetchSearchResults,
  fetchByReference
} from './search-client.js'

vi.mock('./search-client.js', () => ({
  fetchSearchResults: vi.fn(),
  fetchByReference: vi.fn()
}))

// The backend returns stored registrations, so this layer maps them onto the
// Operator shape the page expects.
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

describe('delegates to the backend client', () => {
  test('searchRegister forwards the query + token to fetchSearchResults', async () => {
    vi.mocked(fetchSearchResults).mockResolvedValue([storedRegistration])

    await searchRegister({ query: 'live', token: 'tok' })

    expect(fetchSearchResults).toHaveBeenCalledWith({ query: 'live', token: 'tok' })
  })

  test('searchRegister maps stored registrations onto the Operator shape', async () => {
    vi.mocked(fetchSearchResults).mockResolvedValue([storedRegistration])

    const [operator] = await searchRegister({ query: 'live', token: 'tok' })

    expect(operator.businessName).toBe('Live Co')
    // Coded slugs become display labels, and the nested stored names flatten.
    expect(operator.activities).toEqual(['Manufacture, process or import'])
    expect(operator.contact.name).toBe('Jo')
    expect(operator.address.town).toBe('Town')
    expect(operator.registeredDate).toBe('2026-03-11')
    // Fields the register journey does not persist get their POC defaults.
    expect(operator.status).toBe('Registered')
  })

  test('getByReference forwards the reference + token to fetchByReference', async () => {
    vi.mocked(fetchByReference).mockResolvedValue(storedRegistration)

    const result = await getByReference('OCR-9', 'tok')

    expect(result.reference).toBe('OCR-9')
    expect(result.activities).toEqual(['Manufacture, process or import'])
    expect(fetchByReference).toHaveBeenCalledWith('OCR-9', 'tok')
  })

  test('getByReference keeps a not-found null rather than mapping it', async () => {
    vi.mocked(fetchByReference).mockResolvedValue(null)

    expect(await getByReference('OCR-nope', 'tok')).toBeNull()
  })
})
