import { getSession } from '#/server/common/helpers/get-session.js'
import { redirectToNextPage } from '#/server/common/helpers/journey-navigation.js'
import { getNextPage, STORAGE_CONTACT_PAGE } from '#/server/common/helpers/journey.js'
import {
  getUsingPPPsAnswers,
  setUsingPPPsAnswer
} from '#/server/common/helpers/using-ppps-answers.js'

export const get = {
  handler(request, h) {
    const formSession = getSession(request, 'formSession')
    request.yar.set('formSession', formSession)

    return h.view('using-ppps/third-party-storage-contact/index', {
      values: getUsingPPPsAnswers(formSession)['storageContact']
    })
  }
}

export const post = {
  handler(request, h) {
    const formSession = getSession(request, 'formSession')

    setUsingPPPsAnswer(formSession, 'storageContact', request.payload)
    request.yar.set('formSession', formSession)

    return redirectToNextPage(request, h, getNextPage(STORAGE_CONTACT_PAGE, formSession))
  }
}
