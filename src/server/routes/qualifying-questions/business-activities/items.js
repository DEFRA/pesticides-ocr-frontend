export const USING = 'using'
export const SELLING = 'selling'

export const businessActivityItems = [
  { value: USING, text: 'Using PPPs as part of your work' },
  { value: SELLING, text: 'Selling PPPs' }
]

export const businessActivityValues = businessActivityItems.map(
  (item) => item.value
)
