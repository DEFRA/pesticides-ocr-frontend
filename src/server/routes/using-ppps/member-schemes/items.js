export const memberSchemesItems = [
  {
    value: 'red-tractor',
    text: 'Red Tractor',
    hint: {
      text: 'This includes Red Tractor Assurance for crops, fresh produce, sugar beet or salads.'
    }
  },
  {
    value: 'leaf',
    text: 'LEAF Marque',
    hint: {
      text: 'Linking Environment And Farming certification.'
    }
  },
  {
    value: 'soil-association-organic',
    text: 'Soil Association Organic',
    hint: {
      text: 'This includes certified organic farming, growing or processing schemes.'
    }
  },
  {
    value: 'sqc',
    text: 'Scottish Quality Crops (SQC)',
    hint: {
      text: 'For businesses operating under Scottish quality crop assurance guidelines.'
    }
  }
]

export const memberSchemesValues = memberSchemesItems.map((item) => item.value)
