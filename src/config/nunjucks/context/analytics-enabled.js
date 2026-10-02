import { config } from '#/config/config.js'
import { isCaseOfficerPage } from '#/server/common/helpers/case-officer-pages.js'

// Google Analytics and the cookie banner run only where analytics is enabled,
// and never on case-officer pages (see case-officer-pages.js).
export function analyticsEnabledFor(path = '') {
  return config.get('analytics.enabled') && !isCaseOfficerPage(path)
}
