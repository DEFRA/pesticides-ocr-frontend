import { load } from 'cheerio'

import { getSessionCookie } from './session-helpers.js'

export async function answerStep(server, { url, payload, cookie }) {
  const sessionCookie = cookie ?? (await getSessionCookie(server, url))

  await server.inject({
    method: 'POST',
    url,
    payload,
    headers: { cookie: sessionCookie }
  })

  return sessionCookie
}

export async function completeJourney(server, cookie) {
  const sessionCookie = cookie ?? (await getSessionCookie(server, '/business-activities'))
  const answer = (url, payload) =>
    server.inject({ method: 'POST', url, headers: { cookie: sessionCookie }, payload })

  await answer('/business-activities', { businessActivities: ['distributing'] })
  await answer('/business-name', { businessName: 'Pesticides Ltd' })
  await answer('/business-address', { addressPostcode: 'LS1 1AA', addressBuilding: 'Lower Meadow Barn' })
  await answer('/business-address/select', { address: '0' })
  await answer('/business-contact', {
    contactName: 'Jo Bloggs',
    contactTelephone: '01234 567890',
    contactEmail: 'jo@example.com'
  })
  await answer('/address-activity', { addressActivities: ['store'] })

  return sessionCookie
}

// An organisation that applies PPPs itself, in forestry only: answered up to
// the PPP sectors, so the next page is storing products.
export async function answerUpToStoring(server, cookie) {
  const sessionCookie = cookie ?? (await getSessionCookie(server, '/business-activities'))
  const answer = (url, payload) =>
    server.inject({ method: 'POST', url, headers: { cookie: sessionCookie }, payload })

  await answer('/business-activities', { businessActivities: ['using'] })
  await answer('/business-name', { businessName: 'Pesticides Ltd' })
  await answer('/business-address', { addressPostcode: 'LS1 1AA', addressBuilding: 'Lower Meadow Barn' })
  await answer('/business-address/select', { address: '0' })
  await answer('/business-contact', {
    contactName: 'Jo Bloggs',
    contactTelephone: '01234 567890',
    contactEmail: 'jo@example.com'
  })
  await answer('/using-ppps/who-applies', { whoApplies: 'self' })
  await answer('/using-ppps/ppp-sectors', { professionalSectors: ['forestry'], professionalSectorsOther: '' })

  return sessionCookie
}

export async function revisitStep(server, { url, cookie }) {
  const { result } = await server.inject({
    method: 'GET',
    url,
    headers: { cookie }
  })

  return load(result)
}

export function checkedValues(page, name) {
  return page(`input[name="${name}"]:checked`)
    .map((_index, input) => page(input).val())
    .get()
}
