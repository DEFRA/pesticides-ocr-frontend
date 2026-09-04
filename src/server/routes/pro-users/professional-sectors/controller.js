export const get = {
  handler(request, h) {
    request.yar.set('formSession', request.yar.get('formSession') ?? {})
    return h.view('pro-users/professional-sectors/professional-sectors')
  }
}

export const post = {
  handler(request, h) {
    const sectors = request.payload['professionalSectors']
    const other = request.payload['professionalSectorsOther']
    const formSession = request.yar.get('formSession') ?? {}

    formSession['professionalSectors'] = sectors ?? [other]
    request.yar.set('formSession', formSession)

    return h.redirect('/member-schemes')
  }
}
