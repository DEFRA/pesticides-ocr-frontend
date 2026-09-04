/**
 * /cookies page behaviour (EQ-363), adapted from aqie-front-end.
 *
 * Pre-fills the analytics radios from the stored consent, and on submit saves
 * the new choice (applied via Consent Mode) and shows the success banner —
 * without a page reload. Progressive enhancement: without JS the form posts to
 * the server route, which sets the same cookie.
 */
import { getConsentCookie, setConsentCookie } from './cookie-functions.js'

export function initCookiesPage() {
  const $form = document.querySelector('.js-cookies-page-form')
  if (!$form) {
    return
  }

  const $success = document.querySelector('.js-cookies-page-success')
  const consent = getConsentCookie()

  // Pre-select the radio matching the stored preference (default: no).
  const current = consent?.analytics ? 'yes' : 'no'
  const $radio = $form.querySelector(
    `input[name="cookies[analytics]"][value="${current}"]`
  )
  if ($radio) {
    $radio.checked = true
  }

  $form.addEventListener('submit', (event) => {
    event.preventDefault()
    const $selected = $form.querySelector(
      'input[name="cookies[analytics]"]:checked'
    )
    setConsentCookie({ analytics: $selected?.value === 'yes' })

    if ($success) {
      $success.removeAttribute('hidden')
      $success.setAttribute('tabindex', '-1')
      $success.focus()
      window.scrollTo(0, 0)
    }
  })
}
