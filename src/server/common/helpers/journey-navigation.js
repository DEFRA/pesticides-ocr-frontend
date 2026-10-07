import { getSession } from './get-session.js'
import { CHECK_ANSWERS_PAGE, findFirstMissingPage, removeSkippedAnswers } from './journey.js'

const RETURN_URLS_KEY = 'returnUrls'

const isChangeMode = (request) => request?.query?.change === 'true'

const hasSession = (request) => Boolean(request?.yar?.id)

export function redirectToNextPage(request, h, nextPage) {
  const formSession = removeSkippedAnswers(getSession(request, 'formSession'))
  request.yar.set('formSession', formSession)

  if (isChangeMode(request)) {
    const missingPage = findFirstMissingPage(formSession)

    return h.redirect(missingPage === CHECK_ANSWERS_PAGE ? missingPage : `${missingPage}?change=true`)
  }

  setReturnUrl(request, nextPage, request.path)

  return h.redirect(nextPage)
}

export function setReturnUrl(request, page, returnUrl) {
  request.yar.set(RETURN_URLS_KEY, {
    ...request.yar.get(RETURN_URLS_KEY),
    [page]: returnUrl
  })
}

export function getBackLink(request) {
  const app = request?.route?.settings?.app

  if (app?.hideBackLink) {
    return undefined
  }

  if (isChangeMode(request)) {
    return CHECK_ANSWERS_PAGE
  }

  const returnUrls = hasSession(request) ? request.yar.get(RETURN_URLS_KEY) : undefined

  return returnUrls?.[request.path] ?? app?.backLink
}

export function getFormAction(request) {
  return request?.url && `${request.url.pathname}${request.url.search}`
}
