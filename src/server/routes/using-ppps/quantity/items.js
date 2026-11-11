export const QUANTITY_UNIT = 'litres or kilograms'

export const usingQuantityItems = [
  {
    value: '1-29',
    text: '1 to 29'
  },
  {
    value: '30-59',
    text: '30 to 59'
  },
  {
    value: '60-149',
    text: '60 to 149'
  },
  {
    value: '150-399',
    text: '150 to 399'
  },
  {
    value: '400-plus',
    text: '400 and over'
  }
]

export const usingQuantityValues = usingQuantityItems.map((item) => item.value)

// The band label with its unit, e.g. "60 to 149 litres or kilograms", or
// undefined for a value that isn't a band.
export function usingQuantityText(value) {
  const band = usingQuantityItems.find((item) => item.value === value)

  return band ? `${band.text} ${QUANTITY_UNIT}` : undefined
}
