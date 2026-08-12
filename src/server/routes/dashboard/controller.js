import { buildAccount, getAuthSession } from '@defra/hapi-oidc-auth'

export const dashboardController = {
  handler(request, h) {
    const session = getAuthSession(request)
    return h.view('dashboard/index', {
      account: buildAccount(request),
      caseOfficerName: session.name
    })
  }
}
