// Fire-and-forget beacons to the backend's public journey-tracking endpoints
// (EQ-472). These power the consent-free digital completion metric: the DB
// records completions (registrations); these record the other journey events —
// starts, and "not-eligible" exits via the "You do not need to use this service"
// page.
//
// Best-effort by design: never throws, never blocks the journey — recording a
// metric must not affect an applicant's ability to use the service. Each no-ops
// when the backend URL isn't configured (local/mock), so dev emits no failing
// requests. De-duplication (once per session) is the caller's job.

import { fetch } from 'undici'

import { config } from '#/config/config.js'

const BEACON_TIMEOUT_MS = 2000

async function fireBeacon(request, path) {
  const base = config.get('ocrBackend.url')
  if (!base) {
    return
  }

  let url
  try {
    url = new URL(path, base)
  } catch (cause) {
    request?.logger?.warn(
      `journey beacon ${path}: OCR_BACKEND_URL is invalid: ${cause.message}`
    )
    return
  }

  try {
    await fetch(url, {
      method: 'POST',
      signal: AbortSignal.timeout(BEACON_TIMEOUT_MS)
    })
  } catch (cause) {
    request?.logger?.warn(`journey beacon ${path} failed: ${cause.message}`)
  }
}

export function recordJourneyStart(request) {
  return fireBeacon(request, '/metrics/journey-starts')
}

export function recordJourneyNotEligible(request) {
  return fireBeacon(request, '/metrics/journey-not-eligible')
}
