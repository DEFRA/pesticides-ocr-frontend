// Push the page's journey event (EQ-533) to GTM; call only once analytics
// consent is given.
export function pushJourneyEvent() {
  const event = document.getElementById('js-analytics-config')?.dataset.event
  if (!event) {
    return
  }
  window.dataLayer = window.dataLayer || []
  window.dataLayer.push({ event })
}
