export const businessActivityItems = [
  {
    value: 'manufacture',
    text: 'Manufacture, process or import',
    hint: {
      text: 'This includes making, mixing, or bringing professional or amateur PPPs into Great Britain.'
    }
  },
  {
    value: 'market',
    text: 'Place on the market or distribute',
    hint: {
      text: 'This includes wholesaling, supplying, or moving PPPs down the supply chain.'
    }
  },
  {
    value: 'seller-professional',
    text: 'Sell professional PPPs',
    hint: {
      text: 'Selling commercial-grade chemicals, pesticides, or adjuvants to businesses or certified professional users.'
    }
  },
  {
    value: 'seller-amateur',
    text: 'Sell amateur PPPs',
    hint: {
      text: 'Selling home and garden weedkillers, insecticides, or slug pellets to the general public (for example, in a retail shop or garden center).'
    }
  },
  {
    value: 'use-professional',
    text: 'Use professional PPPs as part of work',
    hint: {
      text: 'Applying or storing commercial-grade pesticides, weedkillers, or adjuvants on land, farms, or commercial premises (either yourself or by hiring a contractor).'
    }
  }
]

export const businessActivityValues = businessActivityItems.map(
  (item) => item.value
)
