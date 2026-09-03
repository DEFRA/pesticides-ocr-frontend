import { vi } from 'vitest'

import { viewFailAction } from './view-fail-action.js'

describe('#viewFailAction', () => {
  const view = 'pro-users/check-additional-address/check-additional-address'

  const mockTakeover = vi.fn()
  const mockView = vi.fn(() => ({ takeover: mockTakeover }))
  const h = { view: mockView }

  const error = {
    details: [
      {
        path: ['checkAdditionalAddress'],
        message: 'Select whether you want to add another address'
      }
    ]
  }

  const request = { payload: { checkAdditionalAddress: 'maybe' } }

  const contextFor = () => mockView.mock.calls[0][1]

  test('Should render the given view and take over the response', () => {
    viewFailAction(view)(request, h, error)

    expect(mockView).toHaveBeenCalledWith(view, expect.any(Object))
    expect(mockTakeover).toHaveBeenCalled()
  })

  test('Should pass the error summary and the submitted values to the view', () => {
    viewFailAction(view)(request, h, error)

    expect(contextFor()).toEqual({
      errors: {
        checkAdditionalAddress: {
          text: 'Select whether you want to add another address'
        }
      },
      errorList: [
        {
          text: 'Select whether you want to add another address',
          href: '#checkAdditionalAddress'
        }
      ],
      values: { checkAdditionalAddress: 'maybe' }
    })
  })

  test('Should add nothing beyond the error summary when no context is built', () => {
    viewFailAction(view)(request, h, error)

    expect(Object.keys(contextFor()).sort()).toEqual([
      'errorList',
      'errors',
      'values'
    ])
  })

  test('Should merge the built context into the view context', () => {
    const buildContext = vi.fn(() => ({ address: { number: 1 } }))

    viewFailAction(view, buildContext)(request, h, error)

    expect(contextFor().address).toEqual({ number: 1 })
  })

  test('Should build the context from the failing request so it can read the session', () => {
    const buildContext = vi.fn(() => ({}))

    viewFailAction(view, buildContext)(request, h, error)

    expect(buildContext).toHaveBeenCalledWith(request)
  })

  test('Should not let the built context overwrite the error summary', () => {
    const buildContext = () => ({ errors: {}, errorList: [], values: {} })

    viewFailAction(view, buildContext)(request, h, error)

    expect(contextFor().errorList).toHaveLength(1)
    expect(contextFor().errors['checkAdditionalAddress']).toBeDefined()
    expect(contextFor().values).toEqual({
      checkAdditionalAddress: 'maybe'
    })
  })
})
