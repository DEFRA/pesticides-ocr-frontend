export const STORES_OWN = 'own'
export const STORES_THIRD_PARTY = 'third-party'
export const STORES_NOTHING = 'no'

export const storingItems = [
  {
    value: STORES_OWN,
    text: 'At sites we own'
  },
  {
    value: STORES_THIRD_PARTY,
    text: 'By a third party on our behalf'
  },
  {
    value: STORES_NOTHING,
    text: 'We do not store PPPs',
    behaviour: 'exclusive'
  }
]

export const storingValues = storingItems.map((item) => item.value)
