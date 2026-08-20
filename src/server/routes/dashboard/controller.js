import { buildAccount } from '@defra/hapi-oidc-auth'

export const dashboardController = {
  handler(request, h) {
    return h.view('dashboard/index', {
      account: buildAccount(request)
    })
  }
}
