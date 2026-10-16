export const ONLY_STORING = 'only-storing'

export const businessActivityItems = [
  { value: 'using', text: 'Using PPPs as part of your work' },
  { value: 'manufacturing', text: 'Manufacturing PPPs' },
  { value: 'importing', text: 'Importing PPPs' },
  { value: 'processing', text: 'Processing PPPs' },
  { value: 'selling', text: 'Selling PPPs' },
  { value: 'distributing', text: 'Distributing PPPs' },
  {
    value: ONLY_STORING,
    text: 'Only storing PPPs for other businesses',
    behaviour: 'exclusive'
  }
]

export const businessActivityValues = businessActivityItems.map(
  (item) => item.value
)

// The checkboxes as the page shows them, with an "or" divider before the
// exclusive option. Kept apart from businessActivityItems so the divider never
// reaches the allowed values or the answer labels.
export const businessActivityCheckboxItems = businessActivityItems.flatMap(
  (item) => (item.value === ONLY_STORING ? [{ divider: 'or' }, item] : [item])
)
