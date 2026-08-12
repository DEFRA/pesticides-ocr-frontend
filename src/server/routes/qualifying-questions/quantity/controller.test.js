import { createServer } from '#/server/server.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'

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
    test('Should redirect to check answers page when an amount is given', async () => {
      const { statusCode, headers } = await server.inject({
        method: 'POST',
        url: '/quantity',
        payload: {
          'quantity-type': 'amount',
          'quantity-amount': '80000',
          'quantity-area': ''
        }
      })

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/check-answers')
    })

    test('Should redirect to check answers page when an area is given', async () => {
      const { statusCode, headers } = await server.inject({
        method: 'POST',
        url: '/quantity',
        payload: {
          'quantity-type': 'area',
          'quantity-amount': '',
          'quantity-area': '250'
        }
      })

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/check-answers')
    })

    test('Should return view with error message when nothing is selected', async () => {
      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: '/quantity',
        payload: { 'quantity-type': '' }
      })

      expect(result).toEqual(expect.stringContaining('Select how you want to give the quantity'))
      expect(statusCode).toBe(statusCodes.ok)
    })

    test('Should return view with error message when the amount is empty', async () => {
      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: '/quantity',
        payload: {
          'quantity-type': 'amount',
          'quantity-amount': '',
          'quantity-area': ''
        }
      })

      expect(result).toEqual(expect.stringContaining('Enter an estimated annual quantity'))
      expect(statusCode).toBe(statusCodes.ok)
    })

    test('Should return view with error message when the area is empty', async () => {
      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: '/quantity',
        payload: {
          'quantity-type': 'area',
          'quantity-amount': '',
          'quantity-area': ''
        }
      })

      expect(result).toEqual(expect.stringContaining('Enter an estimated annual area covered'))
      expect(statusCode).toBe(statusCodes.ok)
    })

    test('Should return view with error message when the amount is not a number', async () => {
      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: '/quantity',
        payload: {
          'quantity-type': 'amount',
          'quantity-amount': 'lots',
          'quantity-area': ''
        }
      })

      expect(result).toEqual(expect.stringContaining('Enter a quantity in litres or kilograms'))
      expect(statusCode).toBe(statusCodes.ok)
    })

    test('Should not validate the area when an amount is selected', async () => {
      const { statusCode, headers } = await server.inject({
        method: 'POST',
        url: '/quantity',
        payload: {
          'quantity-type': 'amount',
          'quantity-amount': '80000',
          'quantity-area': 'not a number'
        }
      })

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/check-answers')
    })

    test('Should keep the selected radio and entered value on error', async () => {
      const { result } = await server.inject({
        method: 'POST',
        url: '/quantity',
        payload: {
          'quantity-type': 'area',
          'quantity-amount': '',
          'quantity-area': 'not a number'
        }
      })

      expect(result).toEqual(expect.stringContaining('value="area" checked'))
      expect(result).toEqual(expect.stringContaining('value="not a number"'))
    })
  })
})
