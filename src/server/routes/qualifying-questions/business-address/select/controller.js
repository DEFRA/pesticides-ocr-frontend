import { buildErrorSummary } from '#/server/common/helpers/build-error-summary.js'
import { getSession } from '#/server/common/helpers/get-session.js'
import { redirectToNextPage } from '#/server/common/helpers/journey-navigation.js'
import { getNextPage } from '#/server/common/helpers/journey.js'
import { ADDRESS_SEARCH_PAGE } from '#/server/common/constants/address-pages.js'
import { SELECT_ADDRESS_MESSAGE } from './options.js'
import {
  getAddressSearch,
  isSameAddress,
  lookUpAddresses,
  redirectToSearch,
  renderSelectPage
} from './helpers/select-page.js'

export const get = {
  async handler(request, h) {
    const formSession = getSession(request, 'formSession')
    request.yar.set('formSession', formSession)

    const addressSearch = getAddressSearch(request)

    if (!addressSearch) {
      return redirectToSearch(request, h)
    }

    const addresses = await lookUpAddresses(addressSearch)
    const savedIndex = addresses.findIndex((address) =>
      isSameAddress(address, formSession['address'])
    )

    return renderSelectPage(request, h, {
      addressSearch,
      addresses,
      selected: savedIndex === -1 ? undefined : String(savedIndex)
    })
  }
}

export const post = {
  async handler(request, h) {
    const formSession = getSession(request, 'formSession')
    const addressSearch = getAddressSearch(request)

    if (!addressSearch) {
      return redirectToSearch(request, h)
    }

    const addresses = await lookUpAddresses(addressSearch)
    const address = addresses[Number(request.payload['address'])]

    if (!address) {
      return renderSelectPage(request, h, {
        addressSearch,
        addresses,
        errorSummary: buildErrorSummary([{ path: ['address'], message: SELECT_ADDRESS_MESSAGE }])
      })
    }

    formSession['address'] = address
    request.yar.set('formSession', formSession)

    return redirectToNextPage(request, h, getNextPage(ADDRESS_SEARCH_PAGE, formSession))
  }
}
