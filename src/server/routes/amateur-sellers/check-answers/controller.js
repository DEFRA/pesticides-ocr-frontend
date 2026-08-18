import { buildAnswers } from './helpers/build-answers.js'

export const get = {
  handler(request, h) {
    const formData = request.yar.get('formSession') ?? {}

    return h.view('amateur-sellers/check-answers/check-answers', {
      answers: buildAnswers(formData)
    })
  }
}

export const post = {
  handler(request, h) {
    const formSession = request.yar.get('formSession') ?? {}

    request.yar.set('formSession', formSession)

    return h.redirect('/confirmation')
  }
}
