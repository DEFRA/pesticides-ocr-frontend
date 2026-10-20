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

  // Uses products at the address, which leads through the professional pages.
  // The business activities stay as distributing: "using" would branch off to
  // who applies PPPs instead.
  const usesAtAddress = {
    ...storesProducts,
    addressActivities: ['use'],
    quantity: { quantityType: 'amount', quantity: '80000' },
    professionalSectors: ['amenity'],
    memberSchemes: ['leaf']
  }

  // Uses PPPs as part of its work, answered up to the business contact.
  const appliesProducts = {
    businessActivities: ['using'],
    businessName: 'Pesticides Ltd',
    address: { addressLine1: 'Lower Meadow Barn' },
    primaryContact: { contactName: 'Jo Bloggs' }
  }

  describe('#getNextPage', () => {
    test.each([
      ['/business-activities', { businessActivities: ['selling'] }, '/business-name'],
      ['/business-activities', { businessActivities: ['manufacturing', 'importing'] }, '/business-name'],
      ['/business-activities', { businessActivities: ['only-storing'] }, '/business-name'],
      ['/business-name', { businessActivities: ['selling'] }, '/sell'],
      ['/business-name', { businessActivities: ['selling', 'distributing'] }, '/business-address'],
      ['/business-name', { businessActivities: ['only-storing'] }, '/business-address'],
      ['/business-contact', { businessActivities: ['using'] }, '/who-applies'],
      ['/business-contact', { businessActivities: ['using', 'selling'] }, '/who-applies'],
      ['/business-contact', { businessActivities: ['distributing'] }, '/address-activity'],
      ['/business-contact', { businessActivities: ['only-storing'] }, '/address-activity'],
      ['/business-contact', {}, '/address-activity'],
      ['/who-applies', { whoApplies: 'self' }, '/ppp-sectors'],
      ['/who-applies', { whoApplies: 'contractor' }, '/contractor-address'],
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
      expect(findFirstMissingPage(usesAtAddress)).toBe('/check-answers')
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

    test('Should ask who applies PPPs after the business contact when the business uses PPPs', () => {
      expect(findFirstMissingPage(appliesProducts)).toBe('/who-applies')
    })

    test('Should ask who applies PPPs even when later answers are already held', () => {
      expect(findFirstMissingPage({ ...usesAtAddress, businessActivities: ['using'] })).toBe(
        '/who-applies'
      )
    })

    test('Should go to the PPP sectors when the business applies PPPs itself', () => {
      expect(findFirstMissingPage({ ...appliesProducts, whoApplies: 'self' })).toBe('/ppp-sectors')
    })

    test('Should go to the contractor address when another organisation applies PPPs', () => {
      expect(findFirstMissingPage({ ...appliesProducts, whoApplies: 'contractor' })).toBe(
        '/contractor-address'
      )
    })

    test('Should not ask who applies PPPs when the business does not use PPPs', () => {
      expect(findFirstMissingPage({ ...storesProducts, whoApplies: 'self' })).toBe('/check-answers')
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
      const { professionalSectors, ...withoutSectors } = usesAtAddress

      expect(
        findFirstMissingPage({ ...withoutSectors, addressActivities: ['store'] })
      ).toBe('/check-answers')
    })

    test('Should treat a member scheme answer with nothing selected as answered', () => {
      expect(
        findFirstMissingPage({ ...usesAtAddress, memberSchemes: [] })
      ).toBe('/check-answers')
    })
  })

  describe('#getPreviousPage', () => {
    test('Should return the page before on the route the answers take', () => {
      expect(getPreviousPage('/business-name', usesAtAddress)).toBe('/business-activities')
      expect(getPreviousPage('/business-name', storesProducts)).toBe('/business-activities')
      expect(getPreviousPage('/professional-sectors', usesAtAddress)).toBe('/quantity')
    })

    test('Should return the last answered page for the first unanswered page', () => {
      expect(getPreviousPage('/quantity', { ...storesProducts, addressActivities: ['use'] })).toBe(
        '/address-activity'
      )
    })

    test('Should return the business contact before who applies PPPs', () => {
      expect(getPreviousPage('/who-applies', appliesProducts)).toBe('/business-contact')
      expect(getPreviousPage('/who-applies', { ...appliesProducts, whoApplies: 'self' })).toBe(
        '/business-contact'
      )
    })

    test('Should return who applies PPPs before the page its answer leads to', () => {
      expect(getPreviousPage('/ppp-sectors', { ...appliesProducts, whoApplies: 'self' })).toBe(
        '/who-applies'
      )
      expect(
        getPreviousPage('/contractor-address', { ...appliesProducts, whoApplies: 'contractor' })
      ).toBe('/who-applies')
    })

    test('Should return nothing for who applies PPPs when the business does not use PPPs', () => {
      expect(getPreviousPage('/who-applies', storesProducts)).toBeUndefined()
    })

    test('Should return nothing for the first page', () => {
      expect(getPreviousPage('/business-activities', usesAtAddress)).toBeUndefined()
    })

    test('Should return nothing for a page the answers skip', () => {
      expect(getPreviousPage('/quantity', storesProducts)).toBeUndefined()
    })
  })

  describe('#isOnRoute', () => {
    test('Should include the additional addresses when products are used at the address', () => {
      expect(isOnRoute('/additional-addresses', usesAtAddress)).toBe(true)
    })

    test('Should exclude the additional addresses when products are not used at the address', () => {
      expect(isOnRoute('/additional-addresses', storesProducts)).toBe(false)
    })
  })

  describe('#removeSkippedAnswers', () => {
    const additionalAddresses = [{ address: { addressLine1: 'Highfield Farm' } }]

    test('Should keep every answer on the route', () => {
      const formSession = { ...usesAtAddress, additionalAddresses }

      expect(removeSkippedAnswers(formSession)).toEqual(formSession)
    })

    test('Should remove the quantity and professional answers once products are no longer used', () => {
      const formSession = removeSkippedAnswers({
        ...usesAtAddress,
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
        ...usesAtAddress,
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

    test('Should remove who applies PPPs once using PPPs is no longer ticked', () => {
      const formSession = removeSkippedAnswers({ ...storesProducts, whoApplies: 'self' })

      expect(formSession).toEqual(storesProducts)
    })

    test('Should remove who applies PPPs on the professional route when using PPPs is no longer ticked', () => {
      const formSession = removeSkippedAnswers({
        ...usesAtAddress,
        whoApplies: 'contractor',
        additionalAddresses
      })

      expect(formSession).not.toHaveProperty('whoApplies')
      expect(formSession).toHaveProperty('memberSchemes')
      expect(formSession).toHaveProperty('additionalAddresses')
    })

    test('Should keep who applies PPPs while the business uses PPPs', () => {
      const formSession = { ...appliesProducts, whoApplies: 'self' }

      expect(removeSkippedAnswers(formSession)).toEqual(formSession)
    })

    test.each(['self', 'contractor'])(
      'Should keep the later answers when who applies PPPs (%s) leads off the journey map',
      (whoApplies) => {
        const formSession = {
          ...usesAtAddress,
          businessActivities: ['using'],
          whoApplies,
          additionalAddresses
        }

        expect(removeSkippedAnswers(formSession)).toEqual(formSession)
      }
    )

    test('Should keep the later answers while who applies PPPs is unanswered', () => {
      const formSession = { ...usesAtAddress, businessActivities: ['using'], additionalAddresses }

      expect(removeSkippedAnswers(formSession)).toEqual(formSession)
    })

    test('Should keep answers beyond the first unanswered page', () => {
      const { quantity, ...withoutQuantity } = usesAtAddress

      expect(removeSkippedAnswers(withoutQuantity)).toEqual(withoutQuantity)
    })

    test('Should keep answers that do not belong to a journey page', () => {
      const formSession = { ...storesProducts, 'confirmation-reference': 'OCR-123' }

      expect(removeSkippedAnswers(formSession)).toEqual(formSession)
    })
  })
})
