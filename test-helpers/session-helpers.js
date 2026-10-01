export async function getSessionCookie(server, url) {
  const { headers } = await server.inject({ method: 'GET', url })
  const [setCookie] = headers['set-cookie'] ?? []

  return setCookie ? setCookie.split(';')[0] : null
}

export async function injectWithSession(server, { ...options }) {
  const cookie = await getSessionCookie(server, options.url)

  return server.inject({
    ...options,
    headers: { ...options.headers, cookie }
  })
}

export function createSessionRequest({ payload, formSession = {} } = {}) {
  const store = { formSession }

  const request = {
    payload,
    yar: {
      get: (key) => store[key],
      set: (key, value) => {
        store[key] = value
      }
    }
  }

  return { request, readSession: () => store.formSession }
}

export const sessionResponseToolkit = {
  redirect: (location) => ({ location }),
  view: (name, context) => ({ name, context })
}

// Complete a mock case-officer sign-in (entra.mode is mock in tests) and return
// the authenticated session cookie.
export async function signInCaseOfficer(server) {
  const start = await server.inject({ method: 'GET', url: '/auth/entra/start' })
  const startCookie = start.headers['set-cookie'][0].split(';')[0]
  const callback = await server.inject({
    method: 'GET',
    url: start.headers.location,
    headers: { cookie: startCookie }
  })
  const setCookie = callback.headers['set-cookie']
  // Fail loudly rather than silently falling back to the pre-auth cookie, which
  // would let a broken sign-in flow masquerade as authenticated in the tests.
  if (!setCookie?.length) {
    throw new Error('Expected a session cookie after the OIDC callback')
  }
  return setCookie[0].split(';')[0]
}
