import Joi from 'joi'
import { viewFailAction } from '#/server/common/helpers/view-fail-action.js'
import { pppSectorsItems, pppSectorsValues } from './items.js'

const selectSectorOrOther = 'Select a sector or describe your main type of work'
const otherTooLong = 'Please use 100 characters or fewer'

export const app = {
  pageTitle: 'Which sector are your PPP activities in?',
  items: pppSectorsItems
}

export const validate = {
  payload: Joi.object({
    professionalSectors: Joi.array()
      .items(Joi.string().valid(...pppSectorsValues))
      .single()
      .min(1)
      .when('professionalSectorsOther', {
        is: Joi.exist(),
        then: Joi.forbidden(),
        otherwise: Joi.required()
      })
      .messages({
        'any.required': selectSectorOrOther,
        'any.unknown': selectSectorOrOther,
        'any.only': selectSectorOrOther,
        'array.min': selectSectorOrOther,
        'array.base': selectSectorOrOther
      }),
    professionalSectorsOther: Joi.string().trim().max(100).empty('').messages({
      'string.max': otherTooLong
    })
  }),
  failAction: viewFailAction('using-ppps/ppp-sectors/index')
}
