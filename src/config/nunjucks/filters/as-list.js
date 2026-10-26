// A single checkbox value is posted as a string, which the checkboxes macro's
// "in" check would match as a substring, so this wraps it in a list. Arrays,
// undefined and null pass through unchanged.
export function asList(value) {
  return typeof value === 'string' ? [value] : value
}
