import { getBackLink, getFormAction, redirectToNextPage } from './journey-navigation.js'

describe('#journeyNavigation', () => {
  const answeredJourney = {
    businessActivities: ['seller-amateur'],
    businessName: 'Pesticides Ltd',
    address: { addressLine1: 'Lower Meadow Barn' },
    primaryContact: { contactName: 'Jo Bloggs' },
    addressActivities: ['store']
  }

  const createRequest = ({ path = '/business-name', query = {}, store = {}, app = {} } = {}) => {
    const url = new URL(path, 'http://localhost')
    url.search = new URLSearchParams(query).toString()

    return {
      path,
      query,
      url,
      route: { settings: { app } },
      yar: {
        id: 'session-id',
        get: (key) => store[key],
        set: (key, value) => {
          store[key] = value
        }
      }
    }
  }

  const h = { redirect: (location) => ({ location }) }

  describe('#redirectToNextPage', () => {
    test('Should redirect to the next page and record where it was reached from', () => {
      const store = { returnUrls: { '/business-name': '/business-activities' } }
      const request = createRequest({ store })

      expect(redirectToNextPage(request, h, '/business-address')).toEqual({
        location: '/business-address'
      })
      expect(store.returnUrls).toEqual({
        '/business-name': '/business-activities',
        '/business-address': '/business-name'
      })
    })

    test('Should return to check answers in change mode when nothing is missing', () => {
      const store = { formSession: answeredJourney }
      const request = createRequest({ query: { change: 'true' }, store })

      expect(redirectToNextPage(request, h, '/business-address')).toEqual({
        location: '/check-answers'
      })
      expect(store.returnUrls).toBeUndefined()
    })

    test('Should remove answers to pages the route now skips', () => {
      const store = {
        formSession: { ...answeredJourney, quantity: { quantityType: 'amount', quantity: '80000' } }
      }
      const request = createRequest({ path: '/address-activity', store })

      redirectToNextPage(request, h, '/check-answers')

      expect(store.formSession).toEqual(answeredJourney)
    })

    test('Should go to the first missing page in change mode when an answer opens a branch', () => {
      const store = { formSession: { ...answeredJourney, addressActivities: ['use'] } }
      const request = createRequest({ path: '/address-activity', query: { change: 'true' }, store })

      expect(redirectToNextPage(request, h, '/quantity')).toEqual({
        location: '/quantity?change=true'
      })
    })
  })

  describe('#getBackLink', () => {
    test('Should return to check answers in change mode', () => {
      const request = createRequest({
        query: { change: 'true' },
        store: { returnUrls: { '/business-name': '/main-customer' } }
      })

      expect(getBackLink(request)).toBe('/check-answers')
    })

    test('Should return the page this page was reached from', () => {
      const request = createRequest({
        store: { returnUrls: { '/business-name': '/main-customer' } }
      })

      expect(getBackLink(request)).toBe('/main-customer')
    })

    test('Should fall back to the back link set on the route', () => {
      const request = createRequest({ path: '/business-activities', app: { backLink: '/' } })

      expect(getBackLink(request)).toBe('/')
    })

    test('Should return nothing when the page was not reached from another page', () => {
      expect(getBackLink(createRequest())).toBeUndefined()
    })

    test('Should not read the session before it has started', () => {
      const request = createRequest({ app: { backLink: '/' } })
      request.yar = { id: null, get: () => { throw new Error('Session not started') } }

      expect(getBackLink(request)).toBe('/')
    })

    test('Should return nothing without a request', () => {
      expect(getBackLink(undefined)).toBeUndefined()
    })
  })

  describe('#getFormAction', () => {
    test('Should post the form back to the current page', () => {
      expect(getFormAction(createRequest())).toBe('/business-name')
    })

    test('Should keep change mode when posting the form', () => {
      expect(getFormAction(createRequest({ query: { change: 'true' } }))).toBe(
        '/business-name?change=true'
      )
    })
  })
})
