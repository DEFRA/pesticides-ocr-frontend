export const addressActivityItems = [
  {
    value: 'use',
    text: 'Use plant protection products (PPPs) or adjuvants',
    hint: {
      text: 'This includes applying pesticides, weedkillers or tank-mix additives on site or on nearby land as part of your work.'
    }
  },
  {
    value: 'store',
    text: 'Store plant protection products (PPPs) or adjuvants',
    hint: {
      text: 'This includes keeping commercial or retail-ready chemicals in a designated store, warehouse, stockroom or chemical safe.'
    }
  },
  {
    value: 'records',
    text: 'Keep records of plant protection products (PPPs)',
    hint: {
      text: 'This includes maintaining official acquisition, application, sale or disposal logs required for regulatory inspections.'
    }
  }
]

export const addressActivityValues = addressActivityItems.map(
  (item) => item.value
)
