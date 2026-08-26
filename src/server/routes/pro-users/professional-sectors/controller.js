export const get = {
  handler(request, h) {
    request.yar.set('formSession', request.yar.get('formSession') ?? {})
    return h.view('pro-users/professional-sectors/professional-sectors')
  }
}

export const post = {
  handler(request, h) {
    const sectors = request.payload['professional-sectors']
    const other = request.payload['professional-sectors-other']
    const formSession = request.yar.get('formSession') ?? {}

    formSession['professional-sectors'] = sectors ?? [other]
    request.yar.set('formSession', formSession)

    return h.redirect('/member-schemes')
  }
}
