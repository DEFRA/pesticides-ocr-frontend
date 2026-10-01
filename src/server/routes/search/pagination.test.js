import { describe, test, expect } from 'vitest'

import { buildPagination } from './pagination.js'

const numbers = ({ items }) =>
  items.map((item) => (item.ellipsis ? '…' : item.number))

describe('buildPagination', () => {
  test('is null when the results fit on one page', () => {
    expect(buildPagination('acme', { page: 1, totalPages: 1 })).toBeNull()
    expect(buildPagination('acme', { page: 1, totalPages: 0 })).toBeNull()
  })

  test('links each page back to the same search', () => {
    const pagination = buildPagination('green acres', {
      page: 1,
      totalPages: 2
    })

    expect(pagination.items).toEqual([
      { number: 1, href: '/search?search=green+acres&page=1', current: true },
      { number: 2, href: '/search?search=green+acres&page=2', current: false }
    ])
    expect(pagination.next).toEqual({
      href: '/search?search=green+acres&page=2'
    })
  })

  test('has no previous link on the first page, nor next on the last', () => {
    expect(buildPagination('a', { page: 1, totalPages: 3 })).not.toHaveProperty(
      'previous'
    )
    expect(buildPagination('a', { page: 3, totalPages: 3 })).not.toHaveProperty(
      'next'
    )
  })

  test('links to the pages either side of the current one', () => {
    const pagination = buildPagination('a', { page: 2, totalPages: 3 })

    expect(pagination.previous.href).toBe('/search?search=a&page=1')
    expect(pagination.next.href).toBe('/search?search=a&page=3')
  })

  test('shows the first, last and either side of the current page, with gaps', () => {
    expect(numbers(buildPagination('a', { page: 5, totalPages: 12 }))).toEqual(
      [1, '…', 4, 5, 6, '…', 12]
    )
    expect(numbers(buildPagination('a', { page: 1, totalPages: 12 }))).toEqual(
      [1, 2, '…', 12]
    )
    expect(numbers(buildPagination('a', { page: 3, totalPages: 4 }))).toEqual([
      1, 2, 3, 4
    ])
  })

  test('marks only the current page', () => {
    const { items } = buildPagination('a', { page: 2, totalPages: 3 })

    expect(items.filter((item) => item.current)).toEqual([
      expect.objectContaining({ number: 2 })
    ])
  })

  test('a page past the last links back to the real pages', () => {
    const pagination = buildPagination('a', { page: 9, totalPages: 3 })

    expect(numbers(pagination)).toEqual([1, 2, 3])
    expect(pagination.items.some((item) => item.current)).toBe(false)
    expect(pagination.previous.href).toBe('/search?search=a&page=3')
    expect(pagination).not.toHaveProperty('next')
  })
})
