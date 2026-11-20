export const NEW_REGISTRATION = 'new'
export const UPDATE_REGISTRATION = 'update'

export const startItems = [
  { value: NEW_REGISTRATION, text: 'Register for the first time' },
  { value: UPDATE_REGISTRATION, text: 'Update an existing registration' }
]

export const startValues = startItems.map((item) => item.value)
