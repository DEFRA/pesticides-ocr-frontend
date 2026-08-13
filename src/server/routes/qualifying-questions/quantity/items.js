/**
 * The radios in quantity.njk stay inline because each one carries a conditional
 * reveal, so only the values live here, along with the unit the answer is read
 * back in on the check answers page.
 */
export const quantityTypeItems = [
  {
    value: 'amount',
    text: 'Amount in litres or kilograms',
    unit: 'litres or kilograms'
  },
  {
    value: 'area',
    text: 'Area covered in hectares',
    unit: 'hectares'
  }
]

export const quantityTypeValues = quantityTypeItems.map((item) => item.value)
