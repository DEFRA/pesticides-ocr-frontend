export const professionalSectorsItems = [
  {
    value: 'agriculture-horticulture',
    text: 'Agriculture and horticulture',
    hint: {
      text: 'This includes farming, commercial fruit and vegetable growing, glasshouse production and managed nurseries.'
    }
  },
  {
    value: 'amenity',
    text: 'Amenity',
    hint: {
      text: 'This includes managing public spaces, parks, sports grounds, golf courses, school fields, railway tracks, roadsides and industrial estates.'
    }
  },
  {
    value: 'forestry',
    text: 'Forestry',
    hint: {
      text: 'This includes managing woodlands, commercial timber forests, tree plantations and commercial woodland nurseries.'
    }
  }
]

export const professionalSectorsValues = professionalSectorsItems.map(
  (item) => item.value
)
