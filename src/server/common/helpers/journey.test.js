import {
  findFirstMissingPage,
  getNextPage,
  getPreviousPage,
  isOnRoute,
  removeSkippedAnswers
} from './journey.js'

describe('#journey', () => {
  const storesProducts = {
    businessActivities: ['distributing'],
    businessName: 'Pesticides Ltd',
    address: { addressLine1: 'Lower Meadow Barn' },
    primaryContact: { contactName: 'Jo Bloggs' },
    addressActivities: ['store']
  }

  const usesProducts = {
    ...storesProducts,
    businessActivities: ['using'],
    addressActivities: ['use'],
    quantity: { quantityType: 'amount', quantity: '80000' },
    professionalSectors: ['amenity'],
    memberSchemes: ['leaf']
  }

  describe('#getNextPage', () => {
    test.each([
      ['/business-activities', { businessActivities: ['selling'] }, '/business-name'],
      ['/business-activities', { businessActivities: ['manufacturing', 'importing'] }, '/business-name'],
      ['/business-activities', { businessActivities: ['only-storing'] }, '/business-name'],
      ['/business-name', { businessActivities: ['selling'] }, '/sell'],
      ['/business-name', { businessActivities: ['selling', 'distributing'] }, '/business-address'],
      ['/business-name', { businessActivities: ['only-storing'] }, '/business-address'],
      ['/address-activity', { addressActivities: ['use'] }, '/quantity'],
      ['/address-activity', { addressActivities: ['store'] }, '/check-answers'],
      ['/quantity', { businessActivities: ['selling'] }, '/professional-sectors'],
      ['/quantity', { businessActivities: ['only-storing'] }, '/professional-sectors'],
      ['/member-schemes', {}, '/additional-addresses']
    ])('Should go from %s to the right page for %o', (page, formSession, nextPage) => {
      expect(getNextPage(page, formSession)).toBe(nextPage)
    })
  })

  describe('#findFirstMissingPage', () => {
    test('Should start at the first page when nothing has been answered', () => {
      expect(findFirstMissingPage({})).toBe('/business-activities')
    })

    test('Should return check answers when every relevant page is answered', () => {
      expect(findFirstMissingPage(storesProducts)).toBe('/check-answers')
      expect(findFirstMissingPage(usesProducts)).toBe('/check-answers')
    })

    test('Should go straight from the business activities to the business name', () => {
      expect(findFirstMissingPage({ businessActivities: ['manufacturing'] })).toBe(
        '/business-name'
      )
    })

    test('Should go to the sell section after the business name when only selling', () => {
      expect(
        findFirstMissingPage({ businessActivities: ['selling'], businessName: 'Pesticides Ltd' })
      ).toBe('/sell')
    })

    test('Should ask for quantity once using products makes it relevant', () => {
      expect(
        findFirstMissingPage({ ...storesProducts, addressActivities: ['use'] })
      ).toBe('/quantity')
    })

    test('Should ask for the professional sectors once the quantity is given, whatever the activities', () => {
      expect(
        findFirstMissingPage({
          ...storesProducts,
          addressActivities: ['use'],
          quantity: { quantityType: 'area', quantity: '250' }
        })
      ).toBe('/professional-sectors')
    })

    test('Should ignore pages the answers no longer lead to', () => {
      const { professionalSectors, ...withoutSectors } = usesProducts

      expect(
        findFirstMissingPage({ ...withoutSectors, addressActivities: ['store'] })
      ).toBe('/check-answers')
    })

    test('Should treat a member scheme answer with nothing selected as answered', () => {
      expect(
        findFirstMissingPage({ ...usesProducts, memberSchemes: [] })
      ).toBe('/check-answers')
    })
  })

  describe('#getPreviousPage', () => {
    test('Should return the page before on the route the answers take', () => {
      expect(getPreviousPage('/business-name', usesProducts)).toBe('/business-activities')
      expect(getPreviousPage('/business-name', storesProducts)).toBe('/business-activities')
      expect(getPreviousPage('/professional-sectors', usesProducts)).toBe('/quantity')
    })

    test('Should return the last answered page for the first unanswered page', () => {
      expect(getPreviousPage('/quantity', { ...storesProducts, addressActivities: ['use'] })).toBe(
        '/address-activity'
      )
    })

    test('Should return nothing for the first page', () => {
      expect(getPreviousPage('/business-activities', usesProducts)).toBeUndefined()
    })

    test('Should return nothing for a page the answers skip', () => {
      expect(getPreviousPage('/quantity', storesProducts)).toBeUndefined()
    })
  })

  describe('#isOnRoute', () => {
    test('Should include the additional addresses when products are used at the address', () => {
      expect(isOnRoute('/additional-addresses', usesProducts)).toBe(true)
    })

    test('Should exclude the additional addresses when products are not used at the address', () => {
      expect(isOnRoute('/additional-addresses', storesProducts)).toBe(false)
    })
  })

  describe('#removeSkippedAnswers', () => {
    const additionalAddresses = [{ address: { addressLine1: 'Highfield Farm' } }]

    test('Should keep every answer on the route', () => {
      const formSession = { ...usesProducts, additionalAddresses }

      expect(removeSkippedAnswers(formSession)).toEqual(formSession)
    })

    test('Should remove the quantity and professional answers once products are no longer used', () => {
      const formSession = removeSkippedAnswers({
        ...usesProducts,
        addressActivities: ['store'],
        additionalAddresses
      })

      expect(Object.keys(formSession)).toEqual([
        'businessActivities',
        'businessName',
        'address',
        'primaryContact',
        'addressActivities'
      ])
    })

    test('Should keep the professional answers whatever the business activities are', () => {
      const formSession = removeSkippedAnswers({
        ...usesProducts,
        businessActivities: ['only-storing'],
        additionalAddresses
      })

      expect(formSession).toHaveProperty('quantity')
      expect(formSession).toHaveProperty('professionalSectors')
      expect(formSession).toHaveProperty('memberSchemes')
      expect(formSession).toHaveProperty('additionalAddresses')
    })

    test('Should keep the later answers when the route leaves for the sell section', () => {
      const formSession = { ...storesProducts, businessActivities: ['selling'] }

      expect(removeSkippedAnswers(formSession)).toEqual(formSession)
    })

    test('Should keep answers beyond the first unanswered page', () => {
      const { quantity, ...withoutQuantity } = usesProducts

      expect(removeSkippedAnswers(withoutQuantity)).toEqual(withoutQuantity)
    })

    test('Should keep answers that do not belong to a journey page', () => {
      const formSession = { ...storesProducts, 'confirmation-reference': 'OCR-123' }

      expect(removeSkippedAnswers(formSession)).toEqual(formSession)
    })

    test('Should keep the address search, whether or not an address has been chosen', () => {
      const addressSearch = { addressPostcode: 'AA3 1AB', addressBuilding: '' }
      const { address, ...withoutAddress } = storesProducts

      expect(removeSkippedAnswers({ ...storesProducts, addressSearch })).toHaveProperty(
        'addressSearch',
        addressSearch
      )
      expect(removeSkippedAnswers({ ...withoutAddress, addressSearch })).toHaveProperty(
        'addressSearch',
        addressSearch
      )
    })

    test('Should keep the address search when the address is no longer on the route', () => {
      const addressSearch = { addressPostcode: 'AA3 1AB' }

      const formSession = removeSkippedAnswers({
        businessActivities: ['selling'],
        businessName: 'Pesticides Ltd',
        address: { addressLine1: 'Lower Meadow Barn' },
        addressSearch
      })

      expect(formSession).toHaveProperty('addressSearch', addressSearch)
    })
  })
})
