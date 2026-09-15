// Fire-and-forget beacons to the backend's public journey-tracking endpoints
// (EQ-472). These power the consent-free digital completion metric: the DB
// records completions (registrations); these record the other journey events —
// starts, and "not-eligible" exits via the "You do not need to use this service"
// page.
//
// Best-effort by design: never throws, never blocks the journey — recording a
// metric must not affect an applicant's ability to use the service. Each no-ops
// when the backend URL isn't configured (local/mock), so dev emits no failing
// requests.

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
    const response = await fetch(url, {
      method: 'POST',
      signal: AbortSignal.timeout(BEACON_TIMEOUT_MS)
    })
    // A reachable backend that answers non-2xx (its own error, or a misconfigured
    // path) still resolves the fetch — log it so the metric silently stopping
    // leaves a diagnostic trail. Still swallowed: never break the journey.
    if (!response.ok) {
      request?.logger?.warn(
        `journey beacon ${path} returned ${response.status}`
      )
    }
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

// Record a journey event at most once per session: the first call in a session
// sets its flag, logs it (one line per session — the log demonstrates the
// de-duplication), and fires the beacon; later calls no-op, so refreshes /
// back-navigation don't double-count. Shared by the journey milestone routes.
export function recordOncePerSession(request, { sessionKey, record, logMessage }) {
  if (request.yar.get(sessionKey)) {
    return
  }
  request.yar.set(sessionKey, true)
  request.logger.info(logMessage)
  // Deliberately not awaited — the beacon is best-effort and self-contained (it
  // catches its own errors), so a floating promise is intended here. (`void` is
  // disallowed by this repo's lint config, hence the bare call.)
  record(request)
}
