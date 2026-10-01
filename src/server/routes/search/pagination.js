import { SEARCH_FIELD } from './options.js'

const pageHref = (search, page) =>
  `/search?${new URLSearchParams({ [SEARCH_FIELD]: search, page })}`

export function buildPagination(search, { page, totalPages }) {
  if (totalPages <= 1) {
    return null
  }

  const shownPage = Math.min(page, totalPages)
  const pageNumbers = [
    ...new Set([1, shownPage - 1, shownPage, shownPage + 1, totalPages])
  ]
    .filter((number) => number >= 1 && number <= totalPages)
    .sort((first, second) => first - second)

  const items = pageNumbers.flatMap((number, index) => {
    const item = {
      number,
      href: pageHref(search, number),
      current: number === page
    }
    const skipsPages = index > 0 && number - pageNumbers[index - 1] > 1
    return skipsPages ? [{ ellipsis: true }, item] : [item]
  })

  return {
    ...(page > 1 && {
      previous: { href: pageHref(search, Math.min(page - 1, totalPages)) }
    }),
    ...(page < totalPages && { next: { href: pageHref(search, page + 1) } }),
    items
  }
}
