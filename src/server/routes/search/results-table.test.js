import { describe, test, expect } from 'vitest'

import { buildResultRows } from './results-table.js'

const operator = {
  reference: 'PPP-1A2-B3C',
  businessName: 'Green One',
  contact: { name: 'Jo Bloggs' },
  address: { postcode: 'NR1 1AA' },
  registeredDate: '2026-03-11'
}

describe('buildResultRows', () => {
  test('builds one row per operator, in column order', () => {
    expect(buildResultRows([operator])).toEqual([
      [
        { text: 'PPP-1A2-B3C' },
        { text: 'Green One' },
        { text: 'Jo Bloggs' },
        { text: 'NR1 1AA' },
        { text: '11 March 2026' }
      ]
    ])
  })

  test('leaves the registered date blank when there is none', () => {
    const [row] = buildResultRows([{ ...operator, registeredDate: undefined }])

    expect(row.at(-1)).toEqual({ text: '' })
  })
})
