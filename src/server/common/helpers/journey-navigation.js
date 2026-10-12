import { getSession } from './get-session.js'
import {
  CHECK_ANSWERS_PAGE,
  findFirstMissingPage,
  getPreviousPage,
  removeSkippedAnswers
} from './journey.js'

const isChangeMode = (request) => request?.query?.change === 'true'

const hasSession = (request) => Boolean(request?.yar?.id)

export function redirectToNextPage(request, h, nextPage) {
  const formSession = removeSkippedAnswers(getSession(request, 'formSession'))
  request.yar.set('formSession', formSession)

  if (isChangeMode(request)) {
    const missingPage = findFirstMissingPage(formSession)

    return h.redirect(missingPage === CHECK_ANSWERS_PAGE ? missingPage : `${missingPage}?change=true`)
  }

  return h.redirect(nextPage)
}

export function getBackLink(request) {
  const app = request?.route?.settings?.app ?? {}

  if (app.hideBackLink) {
    return undefined
  }

  if (isChangeMode(request)) {
    return CHECK_ANSWERS_PAGE
  }

  const formSession = hasSession(request) ? getSession(request, 'formSession') : {}

  if (typeof app.backLink === 'function') {
    return app.backLink(formSession)
  }

  return app.backLink ?? getPreviousPage(request?.path, formSession)
}

export function getFormAction(request) {
  return request?.url && `${request.url.pathname}${request.url.search}`
}
