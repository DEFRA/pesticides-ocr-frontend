import * as journey from './journey.js'
import { USING_PPPS_KEY } from '#/server/common/constants/session-keys.js'
import {
  DISTRIBUTING,
  ONLY_STORING,
  PROCESSING,
  SELLING,
  USING
} from '#/server/routes/qualifying-questions/business-activities/items.js'

// Most tests write the using PPPs answers alongside the others, for
// readability. The journey keeps them under formSession.usingPPPs, as the pages
// save them, so these wrappers nest them on the way in and lift them back out
// of removeSkippedAnswers. The '#using PPPs answers' tests use the real shape.
const USING_PPPS_ANSWERS = new Set([
  'whoApplies',
  'contractor',
  'professionalSectors',
  'agriSubsectors',
  'amenitySubsectors',
  'hortiSubsectors',
  'memberSchemes',
  'storing',
  'storageLocation',
  'ownStorageAddress',
  'storageContact',
  'quantity'
])

function nest(answers) {
  const entries = Object.entries(answers)
  const usingPPPs = Object.fromEntries(entries.filter(([key]) => USING_PPPS_ANSWERS.has(key)))
  const others = Object.fromEntries(entries.filter(([key]) => !USING_PPPS_ANSWERS.has(key)))

  return Object.keys(usingPPPs).length ? { ...others, [USING_PPPS_KEY]: usingPPPs } : others
}

function lift({ [USING_PPPS_KEY]: usingPPPs, ...others }) {
  return { ...others, ...usingPPPs }
}

const findFirstMissingPage = (answers) => journey.findFirstMissingPage(nest(answers))
const getNextPage = (page, answers) => journey.getNextPage(page, nest(answers))
const getPreviousPage = (page, answers) => journey.getPreviousPage(page, nest(answers))
const isOnRoute = (page, answers) => journey.isOnRoute(page, nest(answers))
const removeSkippedAnswers = (answers) => lift(journey.removeSkippedAnswers(nest(answers)))

describe('#journey', () => {
  const storesProducts = {
    businessActivities: ['manufacturing'],
    businessName: 'Pesticides Ltd',
    address: { addressLine1: 'Lower Meadow Barn' },
    primaryContact: { contactName: 'Jo Bloggs' },
    addressActivities: ['store']
  }

  // Uses products at the address, which leads on to the optional additional
  // addresses. The business activities stay as manufacturing: "using" would
  // branch off to who applies PPPs instead.
  const usesAtAddress = {
    ...storesProducts,
    addressActivities: ['use']
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
    businessActivities: [USING],
    businessName: 'Pesticides Ltd',
    address: { addressLine1: 'Lower Meadow Barn' },
    primaryContact: { contactName: 'Jo Bloggs' }
  }

  // Applies PPPs itself in a sector with no sub-sector page, doesn't store
  // them, and has given its quantity: the PPP route to check answers.
  const usesPpps = {
    ...appliesProducts,
    whoApplies: 'self',
    professionalSectors: ['forestry'],
    storing: 'no',
    quantity: '60-149'
  }

  describe('#getNextPage', () => {
    test.each([
      ['/business-activities', { businessActivities: [SELLING] }, '/business-name'],
      ['/business-activities', { businessActivities: ['manufacturing', 'importing'] }, '/business-name'],
      ['/business-activities', { businessActivities: [ONLY_STORING] }, '/business-name'],
      ['/business-name', { businessActivities: [SELLING] }, '/sell'],
      ['/business-name', { businessActivities: [SELLING, 'manufacturing'] }, '/business-address'],
      ['/business-name', { businessActivities: [ONLY_STORING] }, '/business-address'],
      ['/business-contact', { businessActivities: [USING] }, '/using-ppps/who-applies'],
      ['/business-contact', { businessActivities: [USING, SELLING] }, '/using-ppps/who-applies'],
      ['/business-contact', { businessActivities: [DISTRIBUTING] }, '/distribute/products'],
      ['/business-contact', { businessActivities: ['manufacturing'] }, '/address-activity'],
      ['/business-contact', { businessActivities: [ONLY_STORING] }, '/storing/products'],
      ['/business-contact', {}, '/address-activity'],
      ['/using-ppps/who-applies', { whoApplies: 'self' }, '/using-ppps/ppp-sectors'],
      ['/using-ppps/who-applies', { whoApplies: 'contractor' }, '/using-ppps/contractor-address'],
      ['/using-ppps/contractor-address', { whoApplies: 'contractor' }, '/using-ppps/ppp-sectors'],
      ['/using-ppps/ppp-sectors', { professionalSectors: ['agriculture'] }, '/using-ppps/agri-subsectors'],
      ['/using-ppps/ppp-sectors', { professionalSectors: ['amenity'] }, '/using-ppps/amenity-subsectors'],
      ['/using-ppps/ppp-sectors', { professionalSectors: ['horticulture'] }, '/using-ppps/horti-subsectors'],
      ['/using-ppps/ppp-sectors', { professionalSectors: ['horticulture', 'agriculture'] }, '/using-ppps/agri-subsectors'],
      ['/using-ppps/ppp-sectors', { professionalSectors: ['amenity', 'agriculture'] }, '/using-ppps/agri-subsectors'],
      ['/using-ppps/ppp-sectors', { professionalSectors: ['horticulture', 'amenity'] }, '/using-ppps/amenity-subsectors'],
      ['/using-ppps/ppp-sectors', { professionalSectors: ['forestry', 'horticulture'] }, '/using-ppps/horti-subsectors'],
      ['/using-ppps/ppp-sectors', { professionalSectors: ['business-premises'] }, '/using-ppps/storing'],
      ['/using-ppps/ppp-sectors', { professionalSectors: ['forestry', 'sports-clubs'] }, '/using-ppps/storing'],
      ['/using-ppps/ppp-sectors', { professionalSectors: ['Vineyard management'] }, '/using-ppps/storing'],
      [
        '/using-ppps/agri-subsectors',
        { professionalSectors: ['agriculture', 'amenity'] },
        '/using-ppps/amenity-subsectors'
      ],
      [
        '/using-ppps/agri-subsectors',
        { professionalSectors: ['agriculture', 'horticulture'] },
        '/using-ppps/horti-subsectors'
      ],
      [
        '/using-ppps/agri-subsectors',
        { professionalSectors: ['agriculture', 'amenity', 'horticulture'] },
        '/using-ppps/amenity-subsectors'
      ],
      ['/using-ppps/agri-subsectors', { professionalSectors: ['agriculture'] }, '/using-ppps/member-schemes'],
      [
        '/using-ppps/agri-subsectors',
        { professionalSectors: ['agriculture', 'forestry'] },
        '/using-ppps/member-schemes'
      ],
      [
        '/using-ppps/amenity-subsectors',
        { professionalSectors: ['amenity', 'horticulture'] },
        '/using-ppps/horti-subsectors'
      ],
      ['/using-ppps/amenity-subsectors', { professionalSectors: ['amenity'] }, '/using-ppps/storing'],
      ['/using-ppps/horti-subsectors', { professionalSectors: ['horticulture'] }, '/using-ppps/member-schemes'],
      ['/using-ppps/storing', { storing: 'own' }, '/using-ppps/storage-location'],
      ['/using-ppps/storage-location', { storageLocation: 'main-address' }, '/using-ppps/quantity'],
      ['/using-ppps/storage-location', { storageLocation: 'main-and-other' }, '/using-ppps/own-storage-address'],
      ['/using-ppps/own-storage-address', {}, '/using-ppps/quantity'],
      ['/using-ppps/third-party-storage-contact', {}, '/using-ppps/quantity'],
      ['/using-ppps/storing', { storing: 'third-party' }, '/using-ppps/third-party-storage-contact'],
      ['/using-ppps/storing', { storing: 'no' }, '/using-ppps/quantity'],
      ['/using-ppps/quantity', { quantity: '1-29' }, '/check-answers'],
      ['/using-ppps/quantity', { quantity: '400-plus' }, '/check-answers'],
      ['/address-activity', { addressActivities: ['use'] }, '/additional-addresses'],
      ['/address-activity', { addressActivities: ['use', 'store'] }, '/additional-addresses'],
      ['/address-activity', { addressActivities: ['store'] }, '/check-answers'],
      ['/using-ppps/member-schemes', {}, '/using-ppps/storing']
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
      expect(findFirstMissingPage(usesPpps)).toBe('/check-answers')
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
      expect(findFirstMissingPage(appliesProducts)).toBe('/using-ppps/who-applies')
    })

    test('Should ask who applies PPPs even when later answers are already held', () => {
      expect(findFirstMissingPage({ ...usesAtAddress, businessActivities: [USING] })).toBe(
        '/using-ppps/who-applies'
      )
    })

    test('Should go to the PPP sectors when the business applies PPPs itself', () => {
      expect(findFirstMissingPage({ ...appliesProducts, whoApplies: 'self' })).toBe('/using-ppps/ppp-sectors')
    })

    test('Should go to the contractor address when another organisation applies PPPs', () => {
      expect(findFirstMissingPage({ ...appliesProducts, whoApplies: 'contractor' })).toBe(
        '/using-ppps/contractor-address'
      )
    })

    test('Should go to the PPP sectors once the contractor is given', () => {
      expect(
        findFirstMissingPage({ ...appliesProducts, whoApplies: 'contractor', contractor })
      ).toBe('/using-ppps/ppp-sectors')
    })

    test('Should stop at the PPP sectors even when later answers are already held', () => {
      expect(
        findFirstMissingPage({ ...usesAtAddress, businessActivities: [USING], whoApplies: 'self' })
      ).toBe('/using-ppps/ppp-sectors')
    })

    test.each([
      [['agriculture', 'horticulture'], '/using-ppps/agri-subsectors'],
      [['amenity', 'horticulture'], '/using-ppps/amenity-subsectors'],
      [['horticulture'], '/using-ppps/horti-subsectors'],
      [['Vineyard management'], '/using-ppps/storing']
    ])('Should go on from the PPP sectors %o to %s', (professionalSectors, nextPage) => {
      expect(
        findFirstMissingPage({ ...appliesProducts, whoApplies: 'self', professionalSectors })
      ).toBe(nextPage)
    })

    test('Should walk from the PPP sectors through storing and the quantity to check answers', () => {
      const { storing, quantity, ...beforeStoring } = usesPpps

      expect(findFirstMissingPage(beforeStoring)).toBe('/using-ppps/storing')
      expect(findFirstMissingPage({ ...beforeStoring, storing })).toBe('/using-ppps/quantity')
      expect(findFirstMissingPage({ ...beforeStoring, storing, quantity })).toBe(
        '/check-answers'
      )
    })

    test.each([
      ['own', '/using-ppps/storage-location'],
      ['third-party', '/using-ppps/third-party-storage-contact']
    ])('Should stop at the storage page that storing %s leads to', (storing, nextPage) => {
      expect(findFirstMissingPage({ ...usesPpps, storing })).toBe(nextPage)
    })

    test('Should go through where products are stored to the quantity when stored only at the main address', () => {
      const { quantity, ...beforeQuantity } = usesPpps
      const ownSites = { ...beforeQuantity, storing: 'own' }

      expect(findFirstMissingPage(ownSites)).toBe('/using-ppps/storage-location')
      expect(findFirstMissingPage({ ...ownSites, storageLocation: 'main-address' })).toBe(
        '/using-ppps/quantity'
      )
      expect(
        findFirstMissingPage({ ...ownSites, storageLocation: 'main-address', quantity })
      ).toBe('/check-answers')
    })

    test('Should ask for the own storage address when stored at other locations too', () => {
      const otherLocations = { ...usesPpps, storing: 'own', storageLocation: 'main-and-other' }
      const { quantity, ...beforeQuantity } = otherLocations
      const ownStorageAddress = { addressLine1: '1 Barn Lane', addressPostcode: 'YO1 7HH' }

      expect(findFirstMissingPage(beforeQuantity)).toBe('/using-ppps/own-storage-address')
      expect(findFirstMissingPage({ ...beforeQuantity, ownStorageAddress })).toBe(
        '/using-ppps/quantity'
      )
      expect(findFirstMissingPage({ ...otherLocations, ownStorageAddress })).toBe('/check-answers')
      expect(
        getPreviousPage('/using-ppps/quantity', { ...otherLocations, ownStorageAddress })
      ).toBe('/using-ppps/own-storage-address')
    })

    test('Should ask for the storage contact when a third party stores the products', () => {
      const thirdParty = { ...usesPpps, storing: 'third-party' }
      const { quantity, ...beforeQuantity } = thirdParty
      const storageContact = { contactName: 'Sam Store', businessName: 'Safe Storage Ltd' }

      expect(findFirstMissingPage(beforeQuantity)).toBe('/using-ppps/third-party-storage-contact')
      expect(findFirstMissingPage({ ...beforeQuantity, storageContact })).toBe('/using-ppps/quantity')
      expect(findFirstMissingPage({ ...thirdParty, storageContact })).toBe('/check-answers')
      expect(getPreviousPage('/using-ppps/quantity', { ...thirdParty, storageContact })).toBe(
        '/using-ppps/third-party-storage-contact'
      )
    })

    test('Should remove the storage contact once a third party no longer stores the products', () => {
      expect(
        removeSkippedAnswers({ ...usesPpps, storageContact: { contactName: 'Sam Store' } })
      ).toEqual(usesPpps)
    })

    test('Should remove the own storage address once it is only stored at the main address', () => {
      const formSession = {
        ...usesPpps,
        storing: 'own',
        storageLocation: 'main-address'
      }

      expect(
        removeSkippedAnswers({ ...formSession, ownStorageAddress: { addressLine1: '1 Barn Lane' } })
      ).toEqual(formSession)
    })

    test.each([
      [['agriculture'], '/using-ppps/member-schemes'],
      [['agriculture', 'amenity'], '/using-ppps/amenity-subsectors'],
      [['agriculture', 'horticulture'], '/using-ppps/horti-subsectors']
    ])(
      'Should go on from the agricultural sectors, with the sectors %o, to %s',
      (professionalSectors, nextPage) => {
        expect(
          findFirstMissingPage({
            ...appliesProducts,
            whoApplies: 'self',
            professionalSectors,
            agriSubsectors: ['arable']
          })
        ).toBe(nextPage)
      }
    )

    test.each([
      [['amenity'], '/using-ppps/storing'],
      [['amenity', 'horticulture'], '/using-ppps/horti-subsectors'],
      [['agriculture', 'amenity'], '/using-ppps/member-schemes']
    ])(
      'Should go on from the amenity sectors, with the sectors %o, to %s',
      (professionalSectors, nextPage) => {
        expect(
          findFirstMissingPage({
            ...appliesProducts,
            whoApplies: 'self',
            professionalSectors,
            agriSubsectors: ['arable'],
            amenitySubsectors: ['parks']
          })
        ).toBe(nextPage)
      }
    )

    test('Should return the page before the amenity sectors', () => {
      const amenityOnly = {
        ...appliesProducts,
        whoApplies: 'self',
        professionalSectors: ['amenity']
      }

      expect(getPreviousPage('/using-ppps/amenity-subsectors', amenityOnly)).toBe(
        '/using-ppps/ppp-sectors'
      )
      expect(
        getPreviousPage('/using-ppps/amenity-subsectors', {
          ...amenityOnly,
          professionalSectors: ['agriculture', 'amenity'],
          agriSubsectors: ['arable']
        })
      ).toBe('/using-ppps/agri-subsectors')
    })

    test.each([
      [['horticulture'], '/using-ppps/ppp-sectors'],
      [['agriculture', 'horticulture'], '/using-ppps/agri-subsectors'],
      [['amenity', 'horticulture'], '/using-ppps/amenity-subsectors'],
      [['agriculture', 'amenity', 'horticulture'], '/using-ppps/amenity-subsectors']
    ])('Should return the page before the horticultural sectors for %o', (professionalSectors, previous) => {
      expect(
        getPreviousPage('/using-ppps/horti-subsectors', {
          ...appliesProducts,
          whoApplies: 'self',
          professionalSectors,
          agriSubsectors: ['arable'],
          amenitySubsectors: ['parks']
        })
      ).toBe(previous)
    })

    test('Should go on to the member schemes, then storing products, after the horticultural sectors', () => {
      const afterHorticulture = {
        ...appliesProducts,
        whoApplies: 'self',
        professionalSectors: ['horticulture'],
        hortiSubsectors: ['ornamentals']
      }

      expect(findFirstMissingPage(afterHorticulture)).toBe('/using-ppps/member-schemes')
      expect(findFirstMissingPage({ ...afterHorticulture, memberSchemes: ['leaf'] })).toBe(
        '/using-ppps/storing'
      )
    })

    test('Should return the PPP sectors before the agricultural sectors', () => {
      expect(
        getPreviousPage('/using-ppps/agri-subsectors', {
          ...appliesProducts,
          whoApplies: 'self',
          professionalSectors: ['agriculture']
        })
      ).toBe('/using-ppps/ppp-sectors')
    })

    test('Should ask storing products for a contractor once the sectors are given', () => {
      expect(
        findFirstMissingPage({
          ...appliesProducts,
          whoApplies: 'contractor',
          contractor,
          professionalSectors: ['Vineyard management']
        })
      ).toBe('/using-ppps/storing')
    })

    test('Should not ask who applies PPPs when the business does not use PPPs', () => {
      expect(findFirstMissingPage({ ...storesProducts, whoApplies: 'self' })).toBe('/check-answers')
    })

    test('Should go to check answers when products are used at the address, as additional addresses are optional', () => {
      expect(findFirstMissingPage({ ...storesProducts, addressActivities: ['use'] })).toBe(
        '/check-answers'
      )
    })

    test('Should treat a member scheme answer with nothing selected as answered', () => {
      expect(
        findFirstMissingPage({
          ...appliesProducts,
          whoApplies: 'self',
          professionalSectors: ['horticulture'],
          hortiSubsectors: ['ornamentals'],
          memberSchemes: []
        })
      ).toBe('/using-ppps/storing')
    })
  })

  describe('#getPreviousPage', () => {
    test('Should return the page before on the route the answers take', () => {
      expect(getPreviousPage('/business-name', usesAtAddress)).toBe('/business-activities')
      expect(getPreviousPage('/business-name', storesProducts)).toBe('/business-activities')
      expect(getPreviousPage('/additional-addresses', usesAtAddress)).toBe('/address-activity')
    })

    test('Should return the last answered page for the first unanswered page', () => {
      expect(
        getPreviousPage('/using-ppps/member-schemes', {
          ...appliesProducts,
          whoApplies: 'self',
          professionalSectors: ['horticulture'],
          hortiSubsectors: ['ornamentals']
        })
      ).toBe('/using-ppps/horti-subsectors')
    })

    test('Should return the PPP sectors before storing products', () => {
      const { storing, quantity, ...beforeStoring } = usesPpps

      expect(getPreviousPage('/using-ppps/storing', beforeStoring)).toBe('/using-ppps/ppp-sectors')
      expect(getPreviousPage('/using-ppps/storing', usesPpps)).toBe('/using-ppps/ppp-sectors')
    })

    test('Should return storing products before the quantity', () => {
      const { quantity, ...beforeQuantity } = usesPpps

      expect(getPreviousPage('/using-ppps/quantity', beforeQuantity)).toBe('/using-ppps/storing')
      expect(getPreviousPage('/using-ppps/quantity', usesPpps)).toBe('/using-ppps/storing')
    })

    test('Should return where products are stored before the quantity when stored at sites it owns', () => {
      expect(
        getPreviousPage('/using-ppps/quantity', {
          ...usesPpps,
          storing: 'own',
          storageLocation: 'main-address'
        })
      ).toBe('/using-ppps/storage-location')
    })

    test('Should return nothing for the quantity when storing leads to a storage page', () => {
      expect(getPreviousPage('/using-ppps/quantity', { ...usesPpps, storing: 'own' })).toBeUndefined()
    })

    test('Should return the business contact before who applies PPPs', () => {
      expect(getPreviousPage('/using-ppps/who-applies', appliesProducts)).toBe('/business-contact')
      expect(getPreviousPage('/using-ppps/who-applies', { ...appliesProducts, whoApplies: 'self' })).toBe(
        '/business-contact'
      )
    })

    test('Should return who applies PPPs before the page its answer leads to', () => {
      expect(getPreviousPage('/using-ppps/ppp-sectors', { ...appliesProducts, whoApplies: 'self' })).toBe(
        '/using-ppps/who-applies'
      )
      expect(
        getPreviousPage('/using-ppps/contractor-address', { ...appliesProducts, whoApplies: 'contractor' })
      ).toBe('/using-ppps/who-applies')
    })

    test('Should return who applies PPPs before the contractor address once it is answered', () => {
      expect(
        getPreviousPage('/using-ppps/contractor-address', {
          ...appliesProducts,
          whoApplies: 'contractor',
          contractor
        })
      ).toBe('/using-ppps/who-applies')
    })

    test('Should return the contractor address before the PPP sectors for a contractor', () => {
      expect(
        getPreviousPage('/using-ppps/ppp-sectors', { ...appliesProducts, whoApplies: 'contractor', contractor })
      ).toBe('/using-ppps/contractor-address')
    })

    test('Should return the PPP sectors before the page its answer leads to', () => {
      expect(
        getPreviousPage('/using-ppps/agri-subsectors', {
          ...appliesProducts,
          whoApplies: 'contractor',
          contractor,
          professionalSectors: ['agriculture']
        })
      ).toBe('/using-ppps/ppp-sectors')
    })

    test('Should return nothing for the PPP sectors when the business does not use PPPs', () => {
      expect(getPreviousPage('/using-ppps/ppp-sectors', usesAtAddress)).toBeUndefined()
    })

    test('Should return nothing for who applies PPPs when the business does not use PPPs', () => {
      expect(getPreviousPage('/using-ppps/who-applies', storesProducts)).toBeUndefined()
    })

    test('Should return nothing for the first page', () => {
      expect(getPreviousPage('/business-activities', usesAtAddress)).toBeUndefined()
    })

    test('Should return nothing for a page the answers skip', () => {
      expect(getPreviousPage('/using-ppps/member-schemes', storesProducts)).toBeUndefined()
      expect(getPreviousPage('/using-ppps/storing', storesProducts)).toBeUndefined()
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

    test('Should remove the additional addresses once products are no longer used at the address', () => {
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
        businessActivities: ['importing'],
        additionalAddresses
      })

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
      expect(formSession).toHaveProperty('additionalAddresses')
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
          businessActivities: [USING],
          whoApplies,
          ...answers,
          additionalAddresses
        }

        expect(removeSkippedAnswers(formSession)).toEqual(formSession)
      }
    )

    test('Should keep the later answers while who applies PPPs is unanswered', () => {
      const formSession = { ...usesAtAddress, businessActivities: [USING], additionalAddresses }

      expect(removeSkippedAnswers(formSession)).toEqual(formSession)
    })

    test('Should keep answers beyond the first unanswered page', () => {
      const formSession = { ...appliesProducts, storing: 'no', quantity: '1-29' }

      expect(removeSkippedAnswers(formSession)).toEqual(formSession)
    })

    test('Should keep storing products and the quantity while the route reaches them', () => {
      expect(removeSkippedAnswers(usesPpps)).toEqual(usesPpps)
    })

    test('Should keep the agricultural sectors while agriculture is ticked', () => {
      const formSession = {
        ...appliesProducts,
        whoApplies: 'self',
        professionalSectors: ['agriculture'],
        agriSubsectors: ['arable']
      }

      expect(removeSkippedAnswers(formSession)).toEqual(formSession)
    })

    test('Should remove the agricultural sectors once agriculture is no longer ticked', () => {
      const formSession = removeSkippedAnswers({ ...usesPpps, agriSubsectors: ['arable'] })

      expect(formSession).toEqual(usesPpps)
    })

    test('Should remove the amenity sectors once amenity is no longer ticked', () => {
      const formSession = removeSkippedAnswers({ ...usesPpps, amenitySubsectors: ['parks'] })

      expect(formSession).toEqual(usesPpps)
    })

    test('Should remove the horticultural sectors once horticulture is no longer ticked', () => {
      const formSession = removeSkippedAnswers({ ...usesPpps, hortiSubsectors: ['ornamentals'] })

      expect(formSession).toEqual(usesPpps)
    })

    test('Should keep where products are stored while the route reaches it', () => {
      const formSession = { ...usesPpps, storing: 'own', storageLocation: 'main-address' }

      expect(removeSkippedAnswers(formSession)).toEqual(formSession)
    })

    test('Should remove where products are stored once storing products changes to no', () => {
      const formSession = removeSkippedAnswers({ ...usesPpps, storageLocation: 'main-address' })

      expect(formSession).toEqual(usesPpps)
    })

    test('Should keep storing products and the quantity for a contractor', () => {
      const formSession = { ...usesPpps, whoApplies: 'contractor', contractor }

      expect(removeSkippedAnswers(formSession)).toEqual(formSession)
    })

    test('Should keep storing products and the quantity when who applies PPPs changes to self', () => {
      const formSession = removeSkippedAnswers({ ...usesPpps, contractor })

      expect(formSession).toEqual(usesPpps)
    })

    test.each([
      ['manufacturing', { addressActivities: ['store'] }],
      ['manufacturing', {}],
      ['importing', { addressActivities: ['use'] }]
    ])(
      'Should remove storing products and the quantity once using PPPs is no longer ticked (%s, %o)',
      (businessActivity, answers) => {
        const formSession = removeSkippedAnswers({
          ...usesPpps,
          businessActivities: [businessActivity],
          ...answers
        })

        expect(formSession).not.toHaveProperty('storing')
        expect(formSession).not.toHaveProperty('quantity')
        expect(formSession).not.toHaveProperty('whoApplies')
        expect(formSession).not.toHaveProperty('professionalSectors')
      }
    )

    // Answers beyond the first unanswered page are kept, as there's no view yet
    // of whether the route will reach them.
    test.each([
      [{ professionalSectors: ['agriculture'] }],
      [{ professionalSectors: ['amenity', 'forestry'] }],
      [{ professionalSectors: ['horticulture'] }],
      [{ storing: 'own' }],
      [{ storing: 'third-party' }]
    ])(
      'Should keep storing products and the quantity while an earlier page is unanswered, given %o',
      (answers) => {
        const formSession = { ...usesPpps, ...answers }

        expect(removeSkippedAnswers(formSession)).toEqual(formSession)
      }
    )

    test('Should remove the address activity answers once the PPP route reaches check answers', () => {
      const formSession = removeSkippedAnswers({
        ...usesPpps,
        addressActivities: ['use'],
        additionalAddresses
      })

      expect(formSession).toEqual(usesPpps)
    })

    test('Should keep answers that do not belong to a journey page', () => {
      const formSession = { ...storesProducts, 'confirmation-reference': 'OCR-123' }

      expect(removeSkippedAnswers(formSession)).toEqual(formSession)
    })
  })
  describe('#using PPPs answers', () => {
    const answeredToContact = {
      businessActivities: [USING],
      businessName: 'Pesticides Ltd',
      address: { addressLine1: 'Lower Meadow Barn' },
      primaryContact: { contactName: 'Jo Bloggs' }
    }

    test('Should read the using PPPs answers from formSession.usingPPPs', () => {
      expect(
        journey.findFirstMissingPage({
          ...answeredToContact,
          usingPPPs: { whoApplies: 'self', professionalSectors: ['forestry'], storing: 'no' }
        })
      ).toBe('/using-ppps/quantity')
    })

    test('Should not count using PPPs answers held at the top level', () => {
      expect(journey.findFirstMissingPage({ ...answeredToContact, whoApplies: 'self' })).toBe(
        '/using-ppps/who-applies'
      )
    })

    test('Should remove a skipped using PPPs answer from inside formSession.usingPPPs', () => {
      const formSession = journey.removeSkippedAnswers({
        ...answeredToContact,
        usingPPPs: {
          whoApplies: 'self',
          contractor: { contractorName: 'Spray Contractors Ltd' },
          professionalSectors: ['forestry']
        }
      })

      expect(formSession.usingPPPs).toEqual({ whoApplies: 'self', professionalSectors: ['forestry'] })
    })

    test('Should remove formSession.usingPPPs once every answer in it is skipped', () => {
      const formSession = journey.removeSkippedAnswers({
        ...answeredToContact,
        businessActivities: ['manufacturing'],
        addressActivities: ['store'],
        usingPPPs: { whoApplies: 'self', professionalSectors: ['forestry'] }
      })

      expect(formSession).not.toHaveProperty('usingPPPs')
      expect(formSession.addressActivities).toEqual(['store'])
    })
  })
  describe('#processing PPPs', () => {
    const answeredToContact = {
      businessName: 'Pesticides Ltd',
      address: { addressLine1: 'Lower Meadow Barn' },
      primaryContact: { contactName: 'Jo Bloggs' }
    }
    const processes = { ...answeredToContact, businessActivities: [PROCESSING] }
    const processingPPPs = { products: 'both', sites: '11-50', quantity: 250 }
    const usingPPPs = { whoApplies: 'self', professionalSectors: ['forestry'], storing: 'no', quantity: '1-29' }

    test('Should go from the business contact to the processing products when only processing', () => {
      expect(journey.getNextPage('/business-contact', processes)).toBe('/processing-ppps/products')
      expect(journey.findFirstMissingPage(processes)).toBe('/processing-ppps/products')
    })

    test('Should walk the processing pages to check answers, keeping the answers under processingPPPs', () => {
      expect(
        journey.findFirstMissingPage({ ...processes, processingPPPs: { products: 'ppps' } })
      ).toBe('/processing-ppps/sites')
      expect(
        journey.findFirstMissingPage({ ...processes, processingPPPs: { products: 'ppps', sites: '1-10' } })
      ).toBe('/processing-ppps/quantity')
      expect(journey.findFirstMissingPage({ ...processes, processingPPPs })).toBe('/check-answers')
      expect(journey.getPreviousPage('/processing-ppps/products', processes)).toBe('/business-contact')
    })

    test('Should ask the using PPPs pages first, then processing, when both are ticked', () => {
      const both = { ...answeredToContact, businessActivities: [USING, PROCESSING] }

      expect(journey.getNextPage('/business-contact', both)).toBe('/using-ppps/who-applies')
      expect(journey.findFirstMissingPage({ ...both, usingPPPs })).toBe('/processing-ppps/products')
      expect(journey.getPreviousPage('/processing-ppps/products', { ...both, usingPPPs })).toBe(
        '/using-ppps/quantity'
      )
      expect(journey.findFirstMissingPage({ ...both, usingPPPs, processingPPPs })).toBe(
        '/check-answers'
      )
    })

    test('Should go from the using PPPs quantity to check answers when not processing', () => {
      expect(
        journey.findFirstMissingPage({ ...answeredToContact, businessActivities: [USING], usingPPPs })
      ).toBe('/check-answers')
    })

    test('Should remove the processing answers once processing is no longer ticked', () => {
      const formSession = journey.removeSkippedAnswers({
        ...answeredToContact,
        businessActivities: [USING],
        usingPPPs,
        processingPPPs
      })

      expect(formSession).not.toHaveProperty('processingPPPs')
      expect(formSession.usingPPPs).toEqual(usingPPPs)
    })
  })
  describe('#distribute PPPs', () => {
    const answeredToContact = {
      businessName: 'Pesticides Ltd',
      address: { addressLine1: 'Lower Meadow Barn' },
      primaryContact: { contactName: 'Jo Bloggs' }
    }
    const usingPPPs = { whoApplies: 'self', professionalSectors: ['forestry'], storing: 'no', quantity: '1-29' }
    const processingPPPs = { products: 'ppps', sites: '1-10', quantity: 50 }
    const distributePPPs = { products: 'both', sites: '400-plus', quantity: 900 }
    const answering = (businessActivities, answers = {}) => ({
      ...answeredToContact,
      businessActivities,
      ...answers
    })

    test('Should make the distribute pages the first section when only distributing', () => {
      const formSession = answering([DISTRIBUTING])

      expect(journey.getNextPage('/business-contact', formSession)).toBe('/distribute/products')
      expect(journey.findFirstMissingPage(formSession)).toBe('/distribute/products')
      expect(journey.getPreviousPage('/distribute/products', formSession)).toBe('/business-contact')
    })

    test('Should walk the distribute pages to check answers, keeping the answers under distributePPPs', () => {
      expect(
        journey.findFirstMissingPage(answering([DISTRIBUTING], { distributePPPs: { products: 'ppps' } }))
      ).toBe('/distribute/sites')
      expect(
        journey.findFirstMissingPage(
          answering([DISTRIBUTING], { distributePPPs: { products: 'ppps', sites: '1-10' } })
        )
      ).toBe('/distribute/quantity')
      expect(journey.findFirstMissingPage(answering([DISTRIBUTING], { distributePPPs }))).toBe(
        '/check-answers'
      )
    })

    test.each([
      [[DISTRIBUTING, SELLING], {}, '/business-contact'],
      [[USING, DISTRIBUTING], { usingPPPs }, '/using-ppps/quantity'],
      [[PROCESSING, DISTRIBUTING], { processingPPPs }, '/processing-ppps/quantity'],
      [[DISTRIBUTING, PROCESSING, USING], { usingPPPs, processingPPPs }, '/processing-ppps/quantity']
    ])(
      'Should ask the distribute pages after the other sections for %o',
      (businessActivities, answers, previousPage) => {
        const formSession = answering(businessActivities, answers)

        expect(journey.findFirstMissingPage(formSession)).toBe('/distribute/products')
        expect(journey.getPreviousPage('/distribute/products', formSession)).toBe(previousPage)
      }
    )

    test('Should go from using PPPs to processing, then distributing, when all three are ticked', () => {
      const formSession = answering([DISTRIBUTING, PROCESSING, USING], { usingPPPs })

      expect(journey.findFirstMissingPage(formSession)).toBe('/processing-ppps/products')
    })

    test('Should remove the distribute answers once distributing is no longer ticked', () => {
      const formSession = journey.removeSkippedAnswers(
        answering([PROCESSING], { processingPPPs, distributePPPs })
      )

      expect(formSession).not.toHaveProperty('distributePPPs')
      expect(formSession.processingPPPs).toEqual(processingPPPs)
    })
  })
  describe('#store PPPs', () => {
    const onlyStoring = {
      businessActivities: [ONLY_STORING],
      businessName: 'Pesticides Ltd',
      address: { addressLine1: 'Lower Meadow Barn' },
      primaryContact: { contactName: 'Jo Bloggs' }
    }
    const storePPPs = { products: 'both', sites: '11-50', quantity: 300 }

    test('Should go from the business contact to the store pages when only storing', () => {
      expect(journey.getNextPage('/business-contact', onlyStoring)).toBe('/storing/products')
      expect(journey.findFirstMissingPage(onlyStoring)).toBe('/storing/products')
      expect(journey.getPreviousPage('/storing/products', onlyStoring)).toBe('/business-contact')
    })

    test('Should walk the store pages to check answers, keeping the answers under storePPPs', () => {
      expect(journey.findFirstMissingPage({ ...onlyStoring, storePPPs: { products: 'ppps' } })).toBe(
        '/storing/sites'
      )
      expect(
        journey.findFirstMissingPage({ ...onlyStoring, storePPPs: { products: 'ppps', sites: '1-10' } })
      ).toBe('/storing/quantity')
      expect(journey.findFirstMissingPage({ ...onlyStoring, storePPPs })).toBe('/check-answers')
    })

    test('Should remove the store answers once only storing is no longer ticked', () => {
      const formSession = journey.removeSkippedAnswers({
        ...onlyStoring,
        businessActivities: ['manufacturing'],
        addressActivities: ['store'],
        storePPPs
      })

      expect(formSession).not.toHaveProperty('storePPPs')
    })
  })
})
