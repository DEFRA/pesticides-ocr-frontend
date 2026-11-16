import Joi from 'joi'
import { viewFailAction } from '#/server/common/helpers/view-fail-action.js'
import { amenitySubsectorsItems, amenitySubsectorsValues } from './items.js'

const selectSubsectorOrOther = 'Select an amenity sector or describe your main type of work'
const otherTooLong = 'Please use 100 characters or fewer'

export const app = {
  pageTitle: 'What amenity sectors do you apply PPPs in?',
  items: amenitySubsectorsItems
}

export const validate = {
  payload: Joi.object({
    amenitySubsectors: Joi.array()
      .items(Joi.string().valid(...amenitySubsectorsValues))
      .single()
      .min(1)
      .when('amenitySubsectorsOther', {
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
    amenitySubsectorsOther: Joi.string().trim().max(100).empty('').messages({
      'string.max': otherTooLong
    })
  }),
  failAction: viewFailAction('using-ppps/amenity-subsectors/index')
}
