import Joi from 'joi'

import { CONSENT_FORM_FIELD } from '#/config/cookie-consent.js'
import { getCookies, postCookies } from './controller.js'

// Restrict the consent choice to the two valid values (matches the app's
// convention of validating POST payloads). Keyed by the flat field name a
// browser actually posts (see CONSENT_FORM_FIELD).
const cookiePreferencesSchema = Joi.object({
  [CONSENT_FORM_FIELD]: Joi.string().valid('yes', 'no').required()
})

export const cookies = {
  plugin: {
    name: 'cookies',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/cookies',
          ...getCookies
        },
        {
          method: 'POST',
          path: '/cookies',
          options: {
            validate: {
              payload: cookiePreferencesSchema,
              failAction: (_request, h) => h.redirect('/cookies').takeover()
            }
          },
          ...postCookies
        }
      ])
    }
  }
}
