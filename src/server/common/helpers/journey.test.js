import {
  findFirstMissingPage,
  getNextPage,
  getPreviousPage,
  isOnRoute,
  removeSkippedAnswers
} from './journey.js'
import {
  ONLY_STORING,
  SELLING
} from '#/server/routes/qualifying-questions/business-activities/items.js'

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
    memberSchemes: ['leaf']
  }

  const contractor = {
    contractorName: 'Spray Contractors Ltd',
    address: {
      addressLine1: '1 High Street',
      addressTown: 'York',
      addressPostcode: 'YO1 7HH',
      addressRegion: 'england'
    }
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
      ['/business-activities', { businessActivities: [SELLING] }, '/business-name'],
      ['/business-activities', { businessActivities: ['manufacturing', 'importing'] }, '/business-name'],
      ['/business-activities', { businessActivities: [ONLY_STORING] }, '/business-name'],
      ['/business-name', { businessActivities: [SELLING] }, '/sell'],
      ['/business-name', { businessActivities: [SELLING, 'distributing'] }, '/business-address'],
      ['/business-name', { businessActivities: [ONLY_STORING] }, '/business-address'],
      ['/business-contact', { businessActivities: ['using'] }, '/who-applies'],
      ['/business-contact', { businessActivities: ['using', SELLING] }, '/who-applies'],
      ['/business-contact', { businessActivities: ['distributing'] }, '/address-activity'],
      ['/business-contact', { businessActivities: [ONLY_STORING] }, '/address-activity'],
      ['/business-contact', {}, '/address-activity'],
      ['/who-applies', { whoApplies: 'self' }, '/ppp-sectors'],
      ['/who-applies', { whoApplies: 'contractor' }, '/contractor-address'],
      ['/contractor-address', { whoApplies: 'contractor' }, '/ppp-sectors'],
      ['/ppp-sectors', { professionalSectors: ['agriculture'] }, '/agri-subsectors'],
      ['/ppp-sectors', { professionalSectors: ['amenity'] }, '/amenity-subsector'],
      ['/ppp-sectors', { professionalSectors: ['horticulture'] }, '/horti-subsector'],
      ['/ppp-sectors', { professionalSectors: ['horticulture', 'agriculture'] }, '/agri-subsectors'],
      ['/ppp-sectors', { professionalSectors: ['amenity', 'agriculture'] }, '/agri-subsectors'],
      ['/ppp-sectors', { professionalSectors: ['horticulture', 'amenity'] }, '/amenity-subsector'],
      ['/ppp-sectors', { professionalSectors: ['forestry', 'horticulture'] }, '/horti-subsector'],
      ['/ppp-sectors', { professionalSectors: ['business-premises'] }, '/storing'],
      ['/ppp-sectors', { professionalSectors: ['forestry', 'sports-clubs'] }, '/storing'],
      ['/ppp-sectors', { professionalSectors: ['Vineyard management'] }, '/storing'],
      ['/address-activity', { addressActivities: ['use'] }, '/quantity'],
      ['/address-activity', { addressActivities: ['store'] }, '/check-answers'],
      ['/quantity', { businessActivities: [SELLING] }, '/member-schemes'],
      ['/quantity', { businessActivities: [ONLY_STORING] }, '/member-schemes'],
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
        findFirstMissingPage({ businessActivities: [SELLING], businessName: 'Pesticides Ltd' })
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

    test('Should go to the PPP sectors once the contractor is given', () => {
      expect(
        findFirstMissingPage({ ...appliesProducts, whoApplies: 'contractor', contractor })
      ).toBe('/ppp-sectors')
    })

    test('Should stop at the PPP sectors even when later answers are already held', () => {
      expect(
        findFirstMissingPage({ ...usesAtAddress, businessActivities: ['using'], whoApplies: 'self' })
      ).toBe('/ppp-sectors')
    })

    test.each([
      [['agriculture', 'horticulture'], '/agri-subsectors'],
      [['amenity', 'horticulture'], '/amenity-subsector'],
      [['horticulture'], '/horti-subsector'],
      [['Vineyard management'], '/storing']
    ])('Should go on from the PPP sectors %o to %s', (professionalSectors, nextPage) => {
      expect(
        findFirstMissingPage({ ...appliesProducts, whoApplies: 'self', professionalSectors })
      ).toBe(nextPage)
    })

    test('Should not ask who applies PPPs when the business does not use PPPs', () => {
      expect(findFirstMissingPage({ ...storesProducts, whoApplies: 'self' })).toBe('/check-answers')
    })

    test('Should ask for quantity once using products makes it relevant', () => {
      expect(
        findFirstMissingPage({ ...storesProducts, addressActivities: ['use'] })
      ).toBe('/quantity')
    })

    test('Should ask for the member schemes once the quantity is given, whatever the activities', () => {
      expect(
        findFirstMissingPage({
          ...storesProducts,
          addressActivities: ['use'],
          quantity: { quantityType: 'area', quantity: '250' }
        })
      ).toBe('/member-schemes')
    })

    test('Should ignore pages the answers no longer lead to', () => {
      const { memberSchemes, ...withoutSchemes } = usesAtAddress

      expect(
        findFirstMissingPage({ ...withoutSchemes, addressActivities: ['store'] })
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
      expect(getPreviousPage('/member-schemes', usesAtAddress)).toBe('/quantity')
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

    test('Should return who applies PPPs before the contractor address once it is answered', () => {
      expect(
        getPreviousPage('/contractor-address', {
          ...appliesProducts,
          whoApplies: 'contractor',
          contractor
        })
      ).toBe('/who-applies')
    })

    test('Should return the contractor address before the PPP sectors for a contractor', () => {
      expect(
        getPreviousPage('/ppp-sectors', { ...appliesProducts, whoApplies: 'contractor', contractor })
      ).toBe('/contractor-address')
    })

    test('Should return the PPP sectors before the page its answer leads to', () => {
      expect(
        getPreviousPage('/agri-subsectors', {
          ...appliesProducts,
          whoApplies: 'contractor',
          contractor,
          professionalSectors: ['agriculture']
        })
      ).toBe('/ppp-sectors')
    })

    test('Should return nothing for the PPP sectors when the business does not use PPPs', () => {
      expect(getPreviousPage('/ppp-sectors', usesAtAddress)).toBeUndefined()
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
        businessActivities: [ONLY_STORING],
        additionalAddresses
      })

      expect(formSession).toHaveProperty('quantity')
      expect(formSession).toHaveProperty('memberSchemes')
      expect(formSession).toHaveProperty('additionalAddresses')
    })

    test('Should keep the later answers when the route leaves for the sell section', () => {
      const formSession = { ...storesProducts, businessActivities: [SELLING] }

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

    test('Should remove the contractor once who applies PPPs changes to self', () => {
      const formSession = removeSkippedAnswers({ ...appliesProducts, whoApplies: 'self', contractor })

      expect(formSession).toEqual({ ...appliesProducts, whoApplies: 'self' })
    })

    test.each([
      [['agriculture']],
      [['forestry']],
      [['Vineyard management']]
    ])(
      'Should remove the contractor but keep the PPP sectors %o once who applies PPPs changes to self',
      (professionalSectors) => {
        const formSession = removeSkippedAnswers({
          ...appliesProducts,
          whoApplies: 'self',
          contractor,
          professionalSectors
        })

        expect(formSession).toEqual({ ...appliesProducts, whoApplies: 'self', professionalSectors })
      }
    )

    test('Should remove the PPP sectors once using PPPs is no longer ticked', () => {
      const formSession = removeSkippedAnswers({
        ...usesAtAddress,
        whoApplies: 'self',
        professionalSectors: ['amenity'],
        additionalAddresses
      })

      expect(formSession).not.toHaveProperty('whoApplies')
      expect(formSession).not.toHaveProperty('professionalSectors')
      expect(formSession).toHaveProperty('memberSchemes')
    })

    test('Should keep the contractor and the PPP sectors while another organisation applies PPPs', () => {
      const formSession = {
        ...appliesProducts,
        whoApplies: 'contractor',
        contractor,
        professionalSectors: ['horticulture']
      }

      expect(removeSkippedAnswers(formSession)).toEqual(formSession)
    })

    test('Should remove the contractor once using PPPs is no longer ticked', () => {
      const formSession = removeSkippedAnswers({
        ...storesProducts,
        whoApplies: 'contractor',
        contractor
      })

      expect(formSession).toEqual(storesProducts)
    })

    test('Should keep the contractor while another organisation applies PPPs', () => {
      const formSession = { ...appliesProducts, whoApplies: 'contractor', contractor }

      expect(removeSkippedAnswers(formSession)).toEqual(formSession)
    })

    test('Should keep who applies PPPs while the business uses PPPs', () => {
      const formSession = { ...appliesProducts, whoApplies: 'self' }

      expect(removeSkippedAnswers(formSession)).toEqual(formSession)
    })

    test.each([
      ['self', {}],
      ['self', { professionalSectors: ['amenity'] }],
      ['contractor', {}],
      ['contractor', { contractor }],
      ['contractor', { contractor, professionalSectors: ['Vineyard management'] }]
    ])(
      'Should keep the later answers when who applies PPPs (%s) leads to an unanswered page or off the journey map, given %o',
      (whoApplies, answers) => {
        const formSession = {
          ...usesAtAddress,
          businessActivities: ['using'],
          whoApplies,
          ...answers,
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
