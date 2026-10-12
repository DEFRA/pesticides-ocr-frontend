/**
 * Push the journey milestone the server flagged for this page (EQ-533) to GTM,
 * at most once per page. Called only once analytics consent is given: on load
 * when it already was, or when the user accepts on this page.
 */
export function pushJourneyEvent() {
  const event = document.getElementById('js-analytics-config')?.dataset.event
  if (!event || window.__ocrJourneyEventPushed) {
    return
  }
  window.__ocrJourneyEventPushed = true
  window.dataLayer = window.dataLayer || []
  window.dataLayer.push({ event })
}
