import { createServer } from '#/server/server.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { getSessionCookie, injectWithSession } from '#/test-helpers/session-helpers.js'

describe('#quantityController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  describe('GET /quantity', () => {
    test('Should return view', async () => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/quantity'
      })

      expect(result).toEqual(expect.stringContaining('Quantity |'))
      expect(statusCode).toBe(statusCodes.ok)
    })

    test('Should render both conditional inputs', async () => {
      const { result } = await server.inject({
        method: 'GET',
        url: '/quantity'
      })

      expect(result).toEqual(expect.stringContaining('Amount in litres or kilograms'))
      expect(result).toEqual(expect.stringContaining('Area covered in hectares'))
      expect(result).toEqual(expect.stringContaining('Estimated annual quantity'))
      expect(result).toEqual(expect.stringContaining('Estimated annual area covered'))
    })
  })

  describe('POST /quantity', () => {
    // Where /quantity redirects to depends on the business activities already in
    // the session, so the earlier step has to be answered first.
    const postQuantityAfterActivities = async (activities, payload) => {
      const cookie = await getSessionCookie(server, '/business-activities')

      await server.inject({
        method: 'POST',
        url: '/business-activities',
        payload: { businessActivities: activities },
        headers: { cookie }
      })

      return server.inject({
        method: 'POST',
        url: '/quantity',
        payload,
        headers: { cookie }
      })
    }

    test('Should redirect to check answers page when an amount is given and the only activity is selling amateur PPPs', async () => {
      const { statusCode, headers } = await postQuantityAfterActivities(
        ['seller-amateur'],
        {
          quantityType: 'amount',
          quantityAmount: '80000',
          quantityArea: ''
        }
      )

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/check-answers')
    })

    test('Should redirect to check answers page when an area is given and the only activity is selling amateur PPPs', async () => {
      const { statusCode, headers } = await postQuantityAfterActivities(
        ['seller-amateur'],
        {
          quantityType: 'area',
          quantityAmount: '',
          quantityArea: '250'
        }
      )

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/check-answers')
    })

    test('Should redirect to professional sectors page when a professional activity is also selected', async () => {
      const { statusCode, headers } = await postQuantityAfterActivities(
        ['seller-amateur', 'manufacture'],
        {
          quantityType: 'amount',
          quantityAmount: '80000',
          quantityArea: ''
        }
      )

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/professional-sectors')
    })

    test('Should redirect to professional sectors page when amateur selling is not selected', async () => {
      const { statusCode, headers } = await postQuantityAfterActivities(
        ['manufacture'],
        {
          quantityType: 'amount',
          quantityAmount: '80000',
          quantityArea: ''
        }
      )

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/professional-sectors')
    })

    test('Should not validate the area when an amount is selected', async () => {
      const { statusCode, headers } = await postQuantityAfterActivities(
        ['seller-amateur'],
        {
          quantityType: 'amount',
          quantityAmount: '80000',
          quantityArea: 'not a number'
        }
      )

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/check-answers')
    })

    test('Should return view with error message when nothing is selected', async () => {
      const { result, statusCode } = await injectWithSession(server, {
        method: 'POST',
        url: '/quantity',
        payload: { quantityType: '' }
      })

      expect(result).toEqual(expect.stringContaining('Select how you want to give the quantity'))
      expect(statusCode).toBe(statusCodes.ok)
    })

    test('Should return view with error message when the amount is empty', async () => {
      const { result, statusCode } = await injectWithSession(server, {
        method: 'POST',
        url: '/quantity',
        payload: {
          quantityType: 'amount',
          quantityAmount: '',
          quantityArea: ''
        }
      })

      expect(result).toEqual(expect.stringContaining('Enter an estimated annual quantity'))
      expect(statusCode).toBe(statusCodes.ok)
    })

    test('Should return view with error message when the area is empty', async () => {
      const { result, statusCode } = await injectWithSession(server, {
        method: 'POST',
        url: '/quantity',
        payload: {
          quantityType: 'area',
          quantityAmount: '',
          quantityArea: ''
        }
      })

      expect(result).toEqual(expect.stringContaining('Enter an estimated annual area covered'))
      expect(statusCode).toBe(statusCodes.ok)
    })

    test('Should return view with error message when the amount is not a number', async () => {
      const { result, statusCode } = await injectWithSession(server, {
        method: 'POST',
        url: '/quantity',
        payload: {
          quantityType: 'amount',
          quantityAmount: 'lots',
          quantityArea: ''
        }
      })

      expect(result).toEqual(expect.stringContaining('Enter a quantity in litres or kilograms'))
      expect(statusCode).toBe(statusCodes.ok)
    })

    test('Should keep the selected radio and entered value on error', async () => {
      const { result } = await injectWithSession(server, {
        method: 'POST',
        url: '/quantity',
        payload: {
          quantityType: 'area',
          quantityAmount: '',
          quantityArea: 'not a number'
        }
      })

      expect(result).toEqual(expect.stringContaining('value="area" checked'))
      expect(result).toEqual(expect.stringContaining('value="not a number"'))
    })
  })
})
