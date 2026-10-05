// The case-officer area: sign-in, account, dashboard and search. Its URLs can
// carry personal data (search terms such as names, postcodes and references),
// so these pages never load Google Analytics, which records the full page
// address.
const CASE_OFFICER_PATHS = ['/auth', '/dashboard', '/search']

// Compared case-insensitively and with repeated slashes collapsed, so variants
// such as /SEARCH or //search (which 404 rather than match the route) count too.
const normalise = (path) => path.toLowerCase().replaceAll(/\/{2,}/g, '/')

export const isCaseOfficerPage = (path = '') => {
  const normalised = normalise(path)
  return CASE_OFFICER_PATHS.some(
    (prefix) => normalised === prefix || normalised.startsWith(`${prefix}/`)
  )
}

// Route `security` option for case-officer routes: links and redirects from
// these pages send only the site's origin as the referrer, so a public page
// that loads analytics never sees the search term. Hapi merges it with the
// server's other security headers.
export const caseOfficerSecurity = { referrer: 'strict-origin' }
