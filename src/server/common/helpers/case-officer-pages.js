// The case-officer area: sign-in, account, dashboard and search. Its URLs can
// carry personal data (search terms such as names, postcodes and references),
// so these pages never load Google Analytics, which records the full page
// address.
const CASE_OFFICER_PATHS = ['/auth', '/dashboard', '/search']

export const isCaseOfficerPage = (path = '') =>
  CASE_OFFICER_PATHS.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`)
  )

// Route `security` option for case-officer routes: links and redirects from
// these pages send only the site's origin as the referrer, so a public page
// that loads analytics never sees the search term. Hapi merges it with the
// server's other security headers.
export const caseOfficerSecurity = { referrer: 'strict-origin' }
