/**
 * Progressive enhancement for /verify-email (Option 3 — see
 * magic-link-api-design.md §5.2/D5).
 *
 * D5 requires that opening the link (GET) never verifies the token — only a
 * genuine user click (POST) does. This script keeps that guarantee exactly:
 * it does nothing until the existing "Confirm email address" button is
 * clicked. From that single click, everything that follows (reporting the
 * outcome, and — for the same-browser case — picking up the journey again
 * via /check-your-email) happens automatically, so the applicant doesn't
 * have to click a second "Continue" button to get back to the journey.
 *
 * Without JS (or if any fetch fails), every step still falls back to its
 * normal POST + redirect/page render, so this is pure enhancement, not a
 * replacement behaviour, and D5 holds regardless of whether JS runs.
 */
export function initVerifyEmailPage() {
  const $form = document.querySelector('form[data-verify-email-ajax]')
  if (!$form) {
    return
  }

  $form.addEventListener('submit', async (event) => {
    event.preventDefault()

    const $button = $form.querySelector('button')
    $button?.setAttribute('disabled', 'disabled')

    try {
      const page = await postJson($form.action)
      if (page) {
        await renderOutcome(page)
      } else {
        window.location.reload()
      }
    } catch {
      window.location.reload()
    }
  })
}

// POSTs for JSON and returns the parsed body, or null on a non-OK response
// (the caller then falls back to a real page load).
async function postJson(action) {
  const response = await fetch(action, {
    method: 'POST',
    headers: { Accept: 'application/json' }
  })

  if (!response.ok) {
    return null
  }

  return response.json()
}

async function renderOutcome(page) {
  // A plain `{ redirectTo }` means the step completed with nothing to show
  // (for example, the applicant wasn't on this verification's journey) —
  // just follow it as a real navigation.
  if (page.redirectTo) {
    window.location.assign(page.redirectTo)
    return
  }

  // When the next step is auto-chained (same-browser success), skip
  // painting this intermediate outcome at all — go straight to the final
  // destination so the applicant never sees a flash of "Email address
  // confirmed" before being taken on to the journey. If that next step
  // doesn't resolve cleanly, autoAdvance falls back to rendering this
  // outcome so the applicant isn't left on a blank state.
  if (page.action?.auto) {
    await autoAdvance(page.action.action, page)
    return
  }

  renderOutcomePage(page)
}

async function autoAdvance(action, fallbackPage) {
  try {
    const next = await postJson(action)
    if (next?.redirectTo) {
      window.location.assign(next.redirectTo)
    } else if (next) {
      renderOutcomePage(next)
    } else {
      renderOutcomePage(fallbackPage)
    }
  } catch {
    renderOutcomePage(fallbackPage)
  }
}

function renderOutcomePage(page) {
  const $heading = document.querySelector('h1')
  const $main = document.querySelector('main .govuk-grid-column-two-thirds')
  if (!$heading || !$main) {
    window.location.reload()
    return
  }

  document.title = document.title.replace(/^[^|]+/, `${page.heading} `)
  $heading.textContent = page.heading

  const $paragraphs = page.paragraphs ?? []
  $main.querySelectorAll('.govuk-body').forEach(($p) => $p.remove())
  $main.querySelector('form')?.remove()

  let $insertAfter = $heading
  $paragraphs.forEach((text) => {
    const $p = document.createElement('p')
    $p.className = 'govuk-body'
    $p.textContent = text
    $insertAfter.after($p)
    $insertAfter = $p
  })

  // Auto-chained actions resolve themselves, so there's nothing for the
  // applicant to click.
  if (page.action && !page.action.auto) {
    const $form = document.createElement('form')
    $form.method = 'post'
    $form.action = page.action.action
    $form.noValidate = true

    const $button = document.createElement('button')
    $button.type = 'submit'
    $button.className = 'govuk-button'
    $button.dataset.module = 'govuk-button'
    $button.textContent = page.action.text

    $form.appendChild($button)
    $main.appendChild($form)
  }

  // Move focus to the new heading so screen reader users notice the change
  // (WCAG 2.2.1 — no silent content swap).
  $heading.setAttribute('tabindex', '-1')
  $heading.focus()
}
