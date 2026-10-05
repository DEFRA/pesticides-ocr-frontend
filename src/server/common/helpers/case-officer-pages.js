// Their URLs can carry personal data (search terms), so no analytics here.
const CASE_OFFICER_PATHS = ['/auth', '/dashboard', '/search']

export const isCaseOfficerPage = (path = '') =>
  CASE_OFFICER_PATHS.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`)
  )
