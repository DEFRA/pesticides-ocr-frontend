export const dashboardController = {
  handler(request, h) {
    // `account` is provided globally by the nunjucks context.
    return h.view('dashboard/index')
  }
}
