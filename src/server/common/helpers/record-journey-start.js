// Fire-and-forget beacon to the backend's public journey-start counter
// (POST /metrics/journey-starts). This is the consent-free denominator for the
// case-officer completion-rate metric (EQ-283): the DB already records finishes
// (registrations); this records starts.
//
// Best-effort by design: it never throws and never blocks the journey —
// recording a metric must not affect an applicant's ability to register. It
// no-ops when the backend URL isn't configured (local/mock), so dev doesn't
// emit failing requests.

import { fetch } from 'undici'

import { config } from '#/config/config.js'

const BEACON_TIMEOUT_MS = 2000

export async function recordJourneyStart(request) {
  const base = config.get('ocrBackend.url')
  if (!base) {
    return
  }

  let url
  try {
    url = new URL('/metrics/journey-starts', base)
  } catch (cause) {
    request?.logger?.warn(
      `journey-start beacon: OCR_BACKEND_URL is invalid: ${cause.message}`
    )
    return
  }

  try {
    await fetch(url, {
      method: 'POST',
      signal: AbortSignal.timeout(BEACON_TIMEOUT_MS)
    })
  } catch (cause) {
    request?.logger?.warn(`journey-start beacon failed: ${cause.message}`)
  }
}
