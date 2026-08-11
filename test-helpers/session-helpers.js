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
