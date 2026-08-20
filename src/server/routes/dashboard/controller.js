export const dashboardController = {
  handler(_request, h) {
    // `account` is provided globally by the nunjucks context.
    return h.view('dashboard/index')
  }
}
