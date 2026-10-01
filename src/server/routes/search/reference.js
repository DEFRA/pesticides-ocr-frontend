import { config } from '#/config/config.js'

// A registration reference is the configured prefix followed by two groups of
// three letters or digits, e.g. PPP-1A2-B3C. The prefix is validated as
// upper-case alphanumerics at startup, so it is safe to build a pattern from.
const referencePattern = () =>
  new RegExp(`^${config.get('referencePrefix')}-[A-Z0-9]{3}-[A-Z0-9]{3}$`)

/**
 * The search term as a reference, if it is one — in any case, since GOV.UK
 * advises accepting input regardless of case; the backend stores references
 * upper-case. Otherwise null, meaning the term is a free-text search.
 * @param {string} term
 * @returns {string | null}
 */
export function toReference(term) {
  const candidate = term.trim().toUpperCase()
  return referencePattern().test(candidate) ? candidate : null
}

// An example reference for hints and error messages, using the configured prefix.
export const exampleReference = () => `${config.get('referencePrefix')}-1A2-B3C`
