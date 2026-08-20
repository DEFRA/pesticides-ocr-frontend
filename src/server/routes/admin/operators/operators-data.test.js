import {
  searchOperators,
  getOperatorById,
  toCsv
} from './operators-data.js'

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
})
