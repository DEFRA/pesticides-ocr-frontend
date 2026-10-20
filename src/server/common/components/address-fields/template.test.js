import { renderComponent } from '#/test-helpers/component-helpers.js'
import { regionItems } from '#/server/common/helpers/regions.js'

describe('Address Fields Component', () => {
  const address = {
    addressLine1: '1 High Street',
    addressLine2: 'Flat 2',
    addressTown: 'York',
    addressPostcode: 'YO1 7HH',
    addressRegion: 'wales'
  }

  const classesOf = ($fields, id) => $fields(`#${id}`).attr('class')

  test('Should render the address inputs and the region radios, called Country', () => {
    const $fields = renderComponent('address-fields', { regionItems })

    expect(
      $fields('input.govuk-input')
        .map((_index, input) => $fields(input).attr('name'))
        .get()
    ).toEqual(['addressLine1', 'addressLine2', 'addressTown', 'addressPostcode'])
    expect($fields('label[for="addressLine2"]').text().trim()).toBe('Address line 2 (optional)')
    expect($fields('legend').text().trim()).toBe('Country')
    expect(
      $fields('input[name="addressRegion"]')
        .map((_index, input) => $fields(input).val())
        .get()
    ).toEqual(['england', 'scotland', 'wales'])
  })

  test('Should use the main site address widths by default', () => {
    const $fields = renderComponent('address-fields', { regionItems })

    expect(classesOf($fields, 'addressLine1')).toContain('govuk-!-width-two-thirds')
    expect(classesOf($fields, 'addressLine2')).toContain('govuk-!-width-two-thirds')
    expect(classesOf($fields, 'addressTown')).toContain('govuk-!-width-one-third')
    expect(classesOf($fields, 'addressPostcode')).toContain('govuk-input--width-10')
  })

  test('Should use the width classes it is given', () => {
    const $fields = renderComponent('address-fields', {
      regionItems,
      fieldClasses: {
        addressLine1: 'govuk-!-width-one-half',
        addressLine2: 'govuk-!-width-one-half'
      }
    })

    expect(classesOf($fields, 'addressLine1')).toContain('govuk-!-width-one-half')
    expect(classesOf($fields, 'addressLine2')).toContain('govuk-!-width-one-half')
    expect(classesOf($fields, 'addressTown')).toContain('govuk-!-width-one-third')
  })

  test('Should fill in the values it is given, checking the region', () => {
    const $fields = renderComponent('address-fields', { regionItems, values: address })

    expect($fields('#addressLine1').val()).toBe('1 High Street')
    expect($fields('#addressLine2').val()).toBe('Flat 2')
    expect($fields('#addressTown').val()).toBe('York')
    expect($fields('#addressPostcode').val()).toBe('YO1 7HH')
    expect($fields('input[name="addressRegion"]:checked').val()).toBe('wales')
  })

  test('Should show the error for each field it is given', () => {
    const $fields = renderComponent('address-fields', {
      regionItems,
      errors: {
        addressLine1: { text: 'Enter address line 1' },
        addressTown: { text: 'Enter town or city' },
        addressPostcode: { text: 'Enter a postcode' },
        addressRegion: { text: 'Select a country' }
      }
    })

    expect($fields('#addressLine1-error').text()).toContain('Enter address line 1')
    expect($fields('#addressTown-error').text()).toContain('Enter town or city')
    expect($fields('#addressPostcode-error').text()).toContain('Enter a postcode')
    expect($fields('#addressRegion-error').text()).toContain('Select a country')
  })

  test('Should show no errors when given none', () => {
    const $fields = renderComponent('address-fields', { regionItems, values: address })

    expect($fields('.govuk-error-message')).toHaveLength(0)
  })
})
