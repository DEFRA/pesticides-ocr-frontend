import { load } from 'cheerio'

import { createServer } from '#/server/server.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'

describe('#homeController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('Should provide expected response', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/'
    })

    expect(result).toEqual(expect.stringContaining('Home |'))
    expect(statusCode).toBe(statusCodes.ok)
  })

  test('Should start the journey at the register or update page', async () => {
    const { result } = await server.inject({ method: 'GET', url: '/' })

    expect(load(result)('.govuk-button--start').attr('href')).toBe('/start')
  })

  test('Should show the v1.4 start page content', async () => {
    const { result } = await server.inject({ method: 'GET', url: '/' })
    const page = load(result)

    expect(page('h1').text().trim()).toBe('Register work involving pesticides')
    expect(
      page('main h2')
        .map((_index, heading) => page(heading).text().trim())
        .get()
    ).toEqual([
      'Who must register',
      'Before you start',
      'How long it takes',
      'What happens to your information',
      'Need help?'
    ])
    expect(page('main').text()).toEqual(
      expect.stringContaining(
        'Registration is a legal requirement under the Official Controls (Plant Protection Products) Regulations 2020.'
      )
    )
  })
})
