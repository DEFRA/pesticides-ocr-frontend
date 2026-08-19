export const getSession = (request, session) => {
  return request.yar.get(session) ?? {}
}
