// Updating a registration isn't built yet, so this page only says so.
export const get = {
  handler(_request, h) {
    return h.view('qualifying-questions/update/index')
  }
}
