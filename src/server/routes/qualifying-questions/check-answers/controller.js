function changeAction(href, hiddenText) {
  return { items: [{ href, text: 'Change', visuallyHiddenText: hiddenText }] }
}

export const get = {
  handler(_request, h) {
    // TODO - replace these sample values with the actual answers from the session
    const businessRows = [
      {
        key: { text: 'Business PPP activities' },
        value: { html: ['Manufacture', 'Distribute', 'Sell'].join('<br>') },
        actions: changeAction('/business-activities', 'business PPP activities')
      },
      {
        key: { text: 'Main customer' },
        value: { text: 'Professional and amateur sellers' },
        actions: changeAction('/main-customer', 'main customer')
      },
      {
        key: { text: 'Business name' },
        value: { text: 'Pesticides Ltd' },
        actions: changeAction('/business-name', 'business name')
      },
      {
        key: { text: 'Main address' },
        value: { html: ['Highfield Farm', 'Farm town', 'PH1 1FT', 'England'].join('<br>') },
        actions: changeAction('/business-address', 'main address')
      },
      {
        key: { text: 'Name' },
        value: { text: 'John Smith' },
        actions: changeAction('/business-contact', 'name')
      },
      {
        key: { text: 'Email' },
        value: { text: 'John.Smith@pesticides.co.uk' },
        actions: changeAction('/business-contact', 'email')
      },
      {
        key: { text: 'Telephone' },
        value: { text: '01234 567890' },
        actions: changeAction('/business-contact', 'telephone')
      }
    ]

    const pppActivityRows = [
      {
        key: { text: 'PPP activities at the address' },
        value: { html: ['Use PPPs', 'Store PPPs'].join('<br>') },
        actions: changeAction('/address-activity', 'PPP activities at the address')
      },
      {
        key: { text: 'Quantity of PPPs used in the last year' },
        value: { text: '80,000 Kgs' },
        actions: changeAction('/quantity', 'quantity of PPPs used in the last year')
      }
    ]

    return h.view('qualifying-questions/check-answers/check-answers', {
      businessRows,
      pppActivityRows
    })
  }
}

export const post = {
  handler(_request, h) {
    return h.redirect('/confirmation')
  }
}
