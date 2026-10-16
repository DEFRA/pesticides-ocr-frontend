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

  await answer('/business-activities', { businessActivities: ['selling'] })
  await answer('/business-name', { businessName: 'Pesticides Ltd' })
  await answer('/business-address', {
    addressLine1: 'Lower Meadow Barn',
    addressTown: 'Farm town',
    addressPostcode: 'LS1 1AA'
  })
  await answer('/business-contact', {
    contactName: 'Jo Bloggs',
    contactTelephone: '01234 567890',
    contactEmail: 'jo@example.com'
  })
  await answer('/address-activity', { addressActivities: ['store'] })

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
