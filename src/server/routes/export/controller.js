import { config } from '#/config/config.js'

export const get = {
  async handler(request, h) {
    const url = new URL(`${config.get('backend.apiUrl')}/export`)
    url.searchParams.set('reference', request.query.reference)

    const response = await fetch(url)

    return h.response(await response.text()).type('text/csv')
  }
}
