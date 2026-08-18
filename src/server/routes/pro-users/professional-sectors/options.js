import Joi from 'joi'
import { viewFailAction } from '#/client/common/helpers/view-fail-action.js'
import {
  professionalSectorsItems,
  professionalSectorsValues
} from './items.js'

export const app = {
  pageTitle: 'Professional Sectors',
  items: professionalSectorsItems
}

const selectSectorOrOther =
  'Select a professional sector or describe your main type of work'

export const validate = {
  payload: Joi.object({
    'professional-sectors': Joi.array()
      .items(Joi.string().valid(...professionalSectorsValues))
      .single()
      .min(1)
      .when('professional-sectors-other', {
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
    'professional-sectors-other': Joi.string()
      .trim()
      .max(100)
      .empty('')
      .messages({
        'string.max': 'Please use 100 characters or fewer'
      })
  }),
  failAction: viewFailAction('pro-users/professional-sectors/professional-sectors')
}
