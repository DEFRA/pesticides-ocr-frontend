import { buildAnswers } from './helpers/build-answers.js'

export const get = {
  handler(request, h) {
    const formData = request.yar.get('formSession') ?? {}

    return h.view('qualifying-questions/check-answers/check-answers', {
      answers: buildAnswers(formData)
    })
  }
}

export const post = {
  handler(_request, h) {
    return h.redirect('/confirmation')
  }
}
