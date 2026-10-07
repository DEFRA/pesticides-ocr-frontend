import { findFirstMissingPage, getNextPage, removeSkippedAnswers } from './journey.js'

describe('#journey', () => {
  const amateurSeller = {
    businessActivities: ['seller-amateur'],
    businessName: 'Pesticides Ltd',
    address: { addressLine1: 'Lower Meadow Barn' },
    primaryContact: { contactName: 'Jo Bloggs' },
    addressActivities: ['store']
  }

  const professionalUser = {
    ...amateurSeller,
    businessActivities: ['use-professional'],
    mainCustomer: 'professional',
    addressActivities: ['use'],
    quantity: { quantityType: 'amount', quantity: '80000' },
    professionalSectors: ['amenity'],
    memberSchemes: ['leaf']
  }

  describe('#getNextPage', () => {
    test.each([
      ['/business-activities', { businessActivities: ['seller-amateur'] }, '/business-name'],
      ['/business-activities', { businessActivities: ['manufacture'] }, '/main-customer'],
      ['/address-activity', { addressActivities: ['use'] }, '/quantity'],
      ['/address-activity', { addressActivities: ['store'] }, '/check-answers'],
      ['/quantity', { businessActivities: ['seller-amateur'] }, '/check-answers'],
      ['/quantity', { businessActivities: ['seller-amateur', 'manufacture'] }, '/professional-sectors'],
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
      expect(findFirstMissingPage(amateurSeller)).toBe('/check-answers')
      expect(findFirstMissingPage(professionalUser)).toBe('/check-answers')
    })

    test('Should ask for quantity once using products makes it relevant', () => {
      expect(
        findFirstMissingPage({ ...amateurSeller, addressActivities: ['use'] })
      ).toBe('/quantity')
    })

    test('Should ask for the main customer once a professional activity makes it relevant', () => {
      expect(
        findFirstMissingPage({ ...amateurSeller, businessActivities: ['manufacture'] })
      ).toBe('/main-customer')
    })

    test('Should ask for the professional sectors once selling only amateur products no longer applies', () => {
      expect(
        findFirstMissingPage({
          ...amateurSeller,
          businessActivities: ['seller-amateur', 'manufacture'],
          mainCustomer: 'both',
          addressActivities: ['use'],
          quantity: { quantityType: 'area', quantity: '250' }
        })
      ).toBe('/professional-sectors')
    })

    test('Should ignore pages the answers no longer lead to', () => {
      const { mainCustomer, ...withoutMainCustomer } = professionalUser

      expect(
        findFirstMissingPage({
          ...withoutMainCustomer,
          businessActivities: ['seller-amateur'],
          addressActivities: ['store']
        })
      ).toBe('/check-answers')
    })

    test('Should treat a member scheme answer with nothing selected as answered', () => {
      expect(
        findFirstMissingPage({ ...professionalUser, memberSchemes: [undefined] })
      ).toBe('/check-answers')
    })
  })

  describe('#removeSkippedAnswers', () => {
    const additionalAddresses = [{ address: { addressLine1: 'Highfield Farm' } }]

    test('Should keep every answer on the route', () => {
      const formSession = { ...professionalUser, additionalAddresses }

      expect(removeSkippedAnswers(formSession)).toEqual(formSession)
    })

    test('Should remove the main customer once only amateur selling skips it', () => {
      const formSession = removeSkippedAnswers({
        ...professionalUser,
        businessActivities: ['seller-amateur', 'use-professional']
      })

      expect(formSession).not.toHaveProperty('mainCustomer')
      expect(formSession).toHaveProperty('professionalSectors')
    })

    test('Should remove the quantity and professional answers once products are no longer used', () => {
      const formSession = removeSkippedAnswers({
        ...professionalUser,
        addressActivities: ['store'],
        additionalAddresses
      })

      expect(Object.keys(formSession)).toEqual([
        'businessActivities',
        'businessName',
        'address',
        'primaryContact',
        'addressActivities',
        'mainCustomer'
      ])
    })

    test('Should remove the professional answers once only amateur products are sold', () => {
      const formSession = removeSkippedAnswers({
        ...professionalUser,
        businessActivities: ['seller-amateur'],
        additionalAddresses
      })

      expect(formSession).toHaveProperty('quantity')
      expect(formSession).not.toHaveProperty('professionalSectors')
      expect(formSession).not.toHaveProperty('memberSchemes')
      expect(formSession).not.toHaveProperty('additionalAddresses')
    })

    test('Should keep answers beyond the first unanswered page', () => {
      const { quantity, ...withoutQuantity } = professionalUser

      expect(removeSkippedAnswers(withoutQuantity)).toEqual(withoutQuantity)
    })

    test('Should keep answers that do not belong to a journey page', () => {
      const formSession = { ...amateurSeller, 'confirmation-reference': 'OCR-123' }

      expect(removeSkippedAnswers(formSession)).toEqual(formSession)
    })
  })
})
