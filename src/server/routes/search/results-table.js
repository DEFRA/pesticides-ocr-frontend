import { formatDate } from '#/config/nunjucks/filters/format-date.js'

export const buildResultRows = (operators) =>
  operators.map((operator) => [
    { text: operator.reference },
    { text: operator.businessName },
    { text: operator.contact.name },
    { text: operator.address.postcode },
    {
      text: operator.registeredDate
        ? formatDate(operator.registeredDate, 'd MMMM yyyy')
        : ''
    }
  ])
