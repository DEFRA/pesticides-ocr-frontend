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
