export function buildErrorSummary(error) {
  if (!error) { return {} }
  const details = error.details ?? error
  const errors = {}
  const errorList = []
  for (const { path, message } of details) {
    const key = path.join('.')
    if (errors[key]) { continue }
    errors[key] = { text: message }
    errorList.push({ text: message, href: `#${key}` })
  }
  return { errors, errorList }
}
