import { isCaseOfficerPage } from './case-officer-pages.js'

describe('#isCaseOfficerPage', () => {
  test.each([
    '/search',
    '/search/export',
    '/dashboard',
    '/auth/entra/sign-in',
    '/auth/account'
  ])('is true for %s', (path) => {
    expect(isCaseOfficerPage(path)).toBe(true)
  })

  test.each(['/', '/business-activities', '/cookies', '/searching'])(
    'is false for %s',
    (path) => {
      expect(isCaseOfficerPage(path)).toBe(false)
    }
  )
})
