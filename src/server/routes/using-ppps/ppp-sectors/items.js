export const pppSectorsItems = [
  {
    value: 'agriculture',
    text: 'Agriculture',
    hint: {
      text: 'This includes arable, outdoor vegetables, grasslands and fodder crops.'
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
    value: 'business-premises',
    text: 'Business premises',
    hint: {
      text: 'This includes property maintenance and Caretaking.'
    }
  },
  {
    value: 'forestry',
    text: 'Forestry',
    hint: {
      text: 'This includes managing woodlands, commercial timber forests, tree plantations and commercial woodland nurseries.'
    }
  },
  {
    value: 'horticulture',
    text: 'Horticulture',
    hint: {
      text: 'This includes edible protected crops, orchards and soft fruit, and ornamentals.'
    }
  },
  {
    value: 'public-services',
    text: 'Public Services and Local Authorities'
  },
  {
    value: 'schools-universities',
    text: 'Schools and universities'
  },
  {
    value: 'sports-clubs',
    text: 'Sports Clubs and Facilities'
  }
]

export const pppSectorsValues = pppSectorsItems.map((item) => item.value)
