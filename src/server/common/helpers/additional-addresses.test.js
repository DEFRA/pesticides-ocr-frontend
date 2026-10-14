import { removeUnfinishedAddresses } from './additional-addresses.js'

describe('#removeUnfinishedAddresses', () => {
  const finishedAddress = {
    address: { addressLine1: 'Highfield Farm' },
    contact: { contactName: 'John Smith' },
    activity: ['store']
  }

  test('Should keep every finished address', () => {
    const formSession = { additionalAddresses: [finishedAddress, finishedAddress] }

    expect(removeUnfinishedAddresses(formSession)).toEqual(formSession)
  })

  test('Should remove an address that was abandoned before its activity was chosen', () => {
    const { activity, ...abandonedAddress } = finishedAddress

    expect(
      removeUnfinishedAddresses({ additionalAddresses: [finishedAddress, abandonedAddress] })
    ).toEqual({ additionalAddresses: [finishedAddress] })
  })

  test('Should remove an address that only has an address entered', () => {
    expect(
      removeUnfinishedAddresses({ additionalAddresses: [{ address: finishedAddress.address }] })
    ).toEqual({ additionalAddresses: [] })
  })

  test('Should leave a session without additional addresses unchanged', () => {
    const formSession = { businessName: 'Pesticides Ltd' }

    expect(removeUnfinishedAddresses(formSession)).toEqual(formSession)
  })
})
