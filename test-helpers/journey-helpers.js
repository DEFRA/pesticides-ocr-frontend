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
