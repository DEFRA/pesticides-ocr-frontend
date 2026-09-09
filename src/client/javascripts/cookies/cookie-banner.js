/**
 * GOV.UK cookie banner behaviour (EQ-363), adapted from aqie-front-end.
 *
 * Shows the banner only when the user hasn't chosen yet, wires Accept/Reject to
 * store consent (which applies it via Consent Mode), and reveals the matching
 * confirmation message. Not shown on the /cookies page (users manage it there).
 */
import {
  getConsentCookie,
  isValidConsentCookie,
  setConsentCookie
} from './cookie-functions.js'

const SELECTORS = {
  banner: "[data-module='govuk-cookie-banner']",
  accept: '.js-cookie-banner-accept',
  reject: '.js-cookie-banner-reject',
  message: '.js-cookie-banner-message',
  confirmAccept: '.js-cookie-banner-confirmation-accept',
  confirmReject: '.js-cookie-banner-confirmation-reject',
  hide: '.js-cookie-banner-hide'
}

function reveal($el) {
  if (!$el) {
    return
  }
  $el.removeAttribute('hidden')
  $el.setAttribute('tabindex', '-1')
  $el.focus()
}

export function initCookieBanner() {
  const $banner = document.querySelector(SELECTORS.banner)
  if (!$banner || window.location.pathname.startsWith('/cookies')) {
    return
  }

  const $message = $banner.querySelector(SELECTORS.message)
  const $accept = $banner.querySelector(SELECTORS.accept)
  const $reject = $banner.querySelector(SELECTORS.reject)
  const $confirmAccept = $banner.querySelector(SELECTORS.confirmAccept)
  const $confirmReject = $banner.querySelector(SELECTORS.confirmReject)
  const $hideButtons = $banner.querySelectorAll(SELECTORS.hide)
  if (!$accept || !$reject || !$message) {
    return
  }

  // Prompt if there's no valid, current-version consent (a policy/version bump
  // re-shows the banner to re-obtain consent).
  if (!isValidConsentCookie(getConsentCookie())) {
    $banner.removeAttribute('hidden')
  }

  $accept.addEventListener('click', () => {
    setConsentCookie({ analytics: true })
    $message.setAttribute('hidden', 'true')
    reveal($confirmAccept)
  })
  $reject.addEventListener('click', () => {
    setConsentCookie({ analytics: false })
    $message.setAttribute('hidden', 'true')
    reveal($confirmReject)
  })
  $hideButtons.forEach(($button) =>
    $button.addEventListener('click', () =>
      $banner.setAttribute('hidden', 'true')
    )
  )
}
