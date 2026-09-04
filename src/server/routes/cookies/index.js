import Joi from 'joi'

import { getCookies, postCookies } from './controller.js'

// Restrict the consent choice to the two valid values (matches the app's
// convention of validating POST payloads).
const cookiePreferencesSchema = Joi.object({
  cookies: Joi.object({
    analytics: Joi.string().valid('yes', 'no').required()
  }).required()
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
