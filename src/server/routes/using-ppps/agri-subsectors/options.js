import Joi from 'joi'
import { viewFailAction } from '#/server/common/helpers/view-fail-action.js'
import { agriSubsectorsItems, agriSubsectorsValues } from './items.js'

const selectSubsectorOrOther = 'Select an agricultural sector or describe your main type of work'
const otherTooLong = 'Please use 100 characters or fewer'

export const app = {
  pageTitle: 'What agricultural sectors do you apply PPPs in?',
  items: agriSubsectorsItems
}

export const validate = {
  payload: Joi.object({
    agriSubsectors: Joi.array()
      .items(Joi.string().valid(...agriSubsectorsValues))
      .single()
      .min(1)
      .when('agriSubsectorsOther', {
        is: Joi.exist(),
        then: Joi.forbidden(),
        otherwise: Joi.required()
      })
      .messages({
        'any.required': selectSubsectorOrOther,
        'any.unknown': selectSubsectorOrOther,
        'any.only': selectSubsectorOrOther,
        'array.min': selectSubsectorOrOther,
        'array.base': selectSubsectorOrOther
      }),
    agriSubsectorsOther: Joi.string().trim().max(100).empty('').messages({
      'string.max': otherTooLong
    })
  }),
  failAction: viewFailAction('using-ppps/agri-subsectors/index')
}
