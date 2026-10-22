import { load } from 'cheerio'

import { createServer } from '#/server/server.js'
import { answerStep, revisitStep, checkedValues } from '#/test-helpers/journey-helpers.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { injectWithSession } from '#/test-helpers/session-helpers.js'

describe('#memberSchemesController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  describe('GET /using-ppps/member-schemes', () => {
    test('Should return view', async () => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/using-ppps/member-schemes'
      })

      expect(result).toEqual(
        expect.stringContaining('Are you a member of any assurance schemes? (optional) |')
      )
      expect(statusCode).toBe(statusCodes.ok)
    })

    test('Should show the question, the schemes with their hints, and Other', async () => {
      const page = await revisitStep(server, { url: '/using-ppps/member-schemes' })
      const textsOf = (selector) =>
        page(selector)
          .map((_index, element) => page(element).text().trim())
          .get()

      expect(page('h1').text().trim()).toBe('Are you a member of any assurance schemes? (optional)')
      expect(page('#memberSchemes-hint').text().trim()).toBe('Select all that apply.')
      expect(textsOf('.govuk-checkboxes__label')).toEqual([
        'Red Tractor',
        'LEAF Marque',
        'Soil Association Organic',
        'Scottish Quality Crops (SQC)'
      ])
      expect(textsOf('.govuk-checkboxes__hint')).toEqual([
        'This includes Red Tractor Assurance for crops, fresh produce, sugar beet or salads.',
        'Linking Environment And Farming certification.',
        'This includes certified organic farming, growing or processing schemes.',
        'For businesses operating under Scottish quality crop assurance guidelines.'
      ])
      expect(page('#memberSchemesOther-hint').text().trim()).toBe(
        'Enter the names of any assurance schemes not listed.'
      )
    })
  })

  describe('POST /using-ppps/member-schemes', () => {
    test('Should not tick an option whose value is part of a single rejected value', async () => {
      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: '/using-ppps/member-schemes',
        payload: { memberSchemes: 'leaf-x' }
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(checkedValues(load(result), 'memberSchemes')).toEqual([])
    })

    const selectSchemeOrOther =
      'Select a member scheme or describe your main type of work'

    const postSchemes = (payload) =>
      injectWithSession(server, {
        method: 'POST',
        url: '/using-ppps/member-schemes',
        payload
      })

    test('Should redirect to storing products when one scheme is selected', async () => {
      const { statusCode, headers } = await postSchemes({
        memberSchemes: 'red-tractor',
        memberSchemesOther: ''
      })

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/using-ppps/storing')
    })

    test('Should redirect to storing products when several schemes are selected', async () => {
      const { statusCode, headers } = await postSchemes({
        memberSchemes: ['leaf', 'sqc'],
        memberSchemesOther: ''
      })

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/using-ppps/storing')
    })

    test('Should redirect to storing products when only Other is given', async () => {
      const { statusCode, headers } = await postSchemes({
        memberSchemesOther: 'Vineyard assurance'
      })

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/using-ppps/storing')
    })

    test('Should redirect to storing products when neither is given, as the question is optional', async () => {
      const { statusCode, headers } = await postSchemes({
        memberSchemesOther: ''
      })

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/using-ppps/storing')
    })

    test('Should save no schemes as an empty list when neither is given', async () => {
      const cookie = await answerStep(server, {
        url: '/using-ppps/member-schemes',
        payload: { memberSchemesOther: '' }
      })

      const { result } = await server.inject({
        method: 'GET',
        url: '/check-answers',
        headers: { cookie }
      })

      expect(result).toEqual(expect.stringMatching(/Assurance schemes[\s\S]*?None/))
    })

    test('Should show an error when both a scheme and Other are given', async () => {
      const { statusCode, result } = await postSchemes({
        memberSchemes: 'red-tractor',
        memberSchemesOther: 'Vineyard assurance'
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining(selectSchemeOrOther))
    })

    test('Should show an error when several schemes and Other are given', async () => {
      const { statusCode, result } = await postSchemes({
        memberSchemes: ['leaf', 'sqc'],
        memberSchemesOther: 'Vineyard assurance'
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining(selectSchemeOrOther))
    })

    test.each([
      ['an unknown scheme', 'made-up-scheme'],
      ['an unknown scheme alongside a real one', ['leaf', 'made-up-scheme']],
      ['the same scheme twice', ['leaf', 'leaf']]
    ])('Should show an error for %s', async (_description, memberSchemes) => {
      const { statusCode, result } = await postSchemes({ memberSchemes, memberSchemesOther: '' })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining(selectSchemeOrOther))
    })

    test('Should show an error when Other is longer than 100 characters', async () => {
      const { statusCode, result } = await postSchemes({
        memberSchemesOther: 'x'.repeat(101)
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(
        expect.stringContaining('Please use 100 characters or fewer')
      )
    })
  })

  describe('Pre-populating from the session', () => {
    const url = '/using-ppps/member-schemes'

    test('Should check the options held in the session', async () => {
      const cookie = await answerStep(server, { url, payload: { memberSchemes: ['leaf'] } })

      const page = await revisitStep(server, { url, cookie })

      expect(checkedValues(page, 'memberSchemes')).toEqual(['leaf'])
      expect(page('#memberSchemesOther').val()).toBe('')
    })

    test('Should populate the other text held in the session', async () => {
      const cookie = await answerStep(server, { url, payload: { memberSchemesOther: 'Something else' } })

      const page = await revisitStep(server, { url, cookie })

      expect(checkedValues(page, 'memberSchemes')).toEqual([])
      expect(page('#memberSchemesOther').val()).toBe('Something else')
    })

    test('Should render the fields empty when nothing is held in the session', async () => {
      const page = await revisitStep(server, { url })

      expect(checkedValues(page, 'memberSchemes')).toEqual([])
      expect(page('#memberSchemesOther').val()).toBe('')
    })

    test('Should tell the browser not to store the page', async () => {
      const { headers } = await server.inject({ method: 'GET', url })

      expect(headers['cache-control']).toBe('no-store')
    })
  })
})
