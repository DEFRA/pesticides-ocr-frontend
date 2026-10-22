import Joi from 'joi'
import { viewFailAction } from '#/server/common/helpers/view-fail-action.js'
import { hortiSubsectorsItems, hortiSubsectorsValues } from './items.js'

const selectSubsectorOrOther = 'Select a horticultural sector or describe your main type of work'
const otherTooLong = 'Please use 100 characters or fewer'

export const app = {
  pageTitle: 'What horticultural sectors do you apply PPPs in?',
  items: hortiSubsectorsItems
}

export const validate = {
  payload: Joi.object({
    hortiSubsectors: Joi.array()
      .items(Joi.string().valid(...hortiSubsectorsValues))
      .single()
      .min(1)
      .when('hortiSubsectorsOther', {
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
    hortiSubsectorsOther: Joi.string().trim().max(100).empty('').messages({
      'string.max': otherTooLong
    })
  }),
  failAction: viewFailAction('using-ppps/horti-subsectors/index')
}
