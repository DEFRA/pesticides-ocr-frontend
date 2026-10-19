import { getSession } from '#/server/common/helpers/get-session.js'

// Shows the addresses found for the search and saves the chosen one as
// `address` (see ./select). The lookup behind it is still a stub.
export const ADDRESS_SELECT_PAGE = '/business-address/select'

export const get = {
  handler(request, h) {
    request.yar.set('formSession', getSession(request, 'formSession'))

    return h.view('qualifying-questions/business-address/index', {
      values: getSession(request, 'formSession')['addressSearch']
    })
  }
}

export const post = {
  handler(request, h) {
    const formSession = getSession(request, 'formSession')

    formSession['addressSearch'] = request.payload
    request.yar.set('formSession', formSession)

    return h.redirect(`${ADDRESS_SELECT_PAGE}${request.url.search}`)
  }
}
