import { describe, test, expect, vi, afterEach } from 'vitest'

import { searchRegister } from './search-data.js'
import { fetchSearchResults } from './search-client.js'

vi.mock('./search-client.js', () => ({
  fetchSearchResults: vi.fn()
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

const pagination = { page: 1, pageSize: 10, totalRecords: 1, totalPages: 1 }

afterEach(() => {
  vi.clearAllMocks()
})

describe('searchRegister', () => {
  test('forwards the query, page and token to fetchSearchResults', async () => {
    vi.mocked(fetchSearchResults).mockResolvedValue({ data: [], pagination })

    await searchRegister({ query: 'live', page: 3, token: 'tok' })

    expect(fetchSearchResults).toHaveBeenCalledWith({
      query: 'live',
      page: 3,
      token: 'tok'
    })
  })

  test('asks for the first page by default', async () => {
    vi.mocked(fetchSearchResults).mockResolvedValue({ data: [], pagination })

    await searchRegister({ query: 'live', token: 'tok' })

    expect(fetchSearchResults).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1 })
    )
  })

  test('maps stored registrations onto the Operator shape, keeping the totals', async () => {
    vi.mocked(fetchSearchResults).mockResolvedValue({
      data: [storedRegistration],
      pagination
    })

    const result = await searchRegister({ query: 'live', token: 'tok' })
    const [operator] = result.operators

    expect(result.pagination).toEqual(pagination)
    expect(operator.businessName).toBe('Live Co')
    // Coded slugs become display labels, and the nested stored names flatten.
    expect(operator.activities).toEqual(['Manufacture, process or import'])
    expect(operator.contact.name).toBe('Jo')
    expect(operator.address.town).toBe('Town')
    expect(operator.registeredDate).toBe('2026-03-11')
    // Fields the register journey does not persist get their POC defaults.
    expect(operator.status).toBe('Registered')
  })
})
