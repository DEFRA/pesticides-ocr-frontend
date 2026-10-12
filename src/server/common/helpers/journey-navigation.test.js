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
    test('Should redirect to the next page', () => {
      const request = createRequest({ store: { formSession: answeredJourney } })

      expect(redirectToNextPage(request, h, '/business-address')).toEqual({
        location: '/business-address'
      })
    })

    test('Should return to check answers in change mode when nothing is missing', () => {
      const store = { formSession: answeredJourney }
      const request = createRequest({ query: { change: 'true' }, store })

      expect(redirectToNextPage(request, h, '/business-address')).toEqual({
        location: '/check-answers'
      })
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
      const request = createRequest({ query: { change: 'true' }, store: { formSession: answeredJourney } })

      expect(getBackLink(request)).toBe('/check-answers')
    })

    test('Should return the previous page on the route the answers take', () => {
      const professional = createRequest({
        store: { formSession: { businessActivities: ['manufacture'], mainCustomer: 'both' } }
      })
      const amateur = createRequest({ store: { formSession: answeredJourney } })

      expect(getBackLink(professional)).toBe('/main-customer')
      expect(getBackLink(amateur)).toBe('/business-activities')
    })

    test('Should return nothing for a page the answers skip', () => {
      const request = createRequest({ path: '/main-customer', store: { formSession: answeredJourney } })

      expect(getBackLink(request)).toBeUndefined()
    })

    test('Should use the back link set on the route', () => {
      const request = createRequest({ path: '/business-activities', app: { backLink: '/' } })

      expect(getBackLink(request)).toBe('/')
    })

    test('Should work out the back link from the answers when the route sets a function', () => {
      const request = createRequest({
        path: '/additional-addresses/address',
        app: { backLink: (formSession) => formSession.businessName },
        store: { formSession: answeredJourney }
      })

      expect(getBackLink(request)).toBe('Pesticides Ltd')
    })

    test('Should return nothing when the route hides the back link', () => {
      const request = createRequest({
        path: '/check-answers',
        app: { hideBackLink: true },
        store: { formSession: answeredJourney }
      })

      expect(getBackLink(request)).toBeUndefined()
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
