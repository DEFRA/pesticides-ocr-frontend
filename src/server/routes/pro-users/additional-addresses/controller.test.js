import { createServer } from '#/server/server.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { injectWithSession } from '#/test-helpers/session-helpers.js'

describe('#additionalAddressesController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  describe('GET /additional-addresses', () => {
    test('Should return view', async () => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/additional-addresses'
      })

      expect(result).toEqual(expect.stringContaining('Additional Addresses |'))
      expect(result).toEqual(
        expect.stringContaining(
          'Do you need to add any additional business addresses?'
        )
      )
      expect(statusCode).toBe(statusCodes.ok)
    })

    test('Should render the Yes and No options', async () => {
      const { result } = await server.inject({
        method: 'GET',
        url: '/additional-addresses'
      })

      expect(result).toEqual(
        expect.stringContaining('value="yes"')
      )
      expect(result).toEqual(expect.stringContaining('value="no"'))
    })
  })

  describe('POST /additional-addresses', () => {
    const selectYesOrNo =
      'Select whether you need to add any additional business addresses'

    const postAddresses = (payload) =>
      injectWithSession(server, {
        method: 'POST',
        url: '/additional-addresses',
        payload
      })

    test('Should redirect to enter-address page when Yes is selected', async () => {
      const { statusCode, headers } = await postAddresses({
        'additional-addresses': 'yes'
      })

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/additional-addresses/enter-address')
    })

    test('Should redirect to check-answers page when No is selected', async () => {
      const { statusCode, headers } = await postAddresses({
        'additional-addresses': 'no'
      })

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/check-answers')
    })

    test('Should return view with error message when nothing is selected', async () => {
      const { statusCode, result } = await postAddresses({})

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining(selectYesOrNo))
    })

    test('Should return view with error message when an unknown value is submitted', async () => {
      const { statusCode, result } = await postAddresses({
        'additional-addresses': 'maybe'
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining(selectYesOrNo))
    })

    test('Should return view with error message when the field is empty', async () => {
      const { statusCode, result } = await postAddresses({
        'additional-addresses': ''
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining(selectYesOrNo))
    })
  })
})
