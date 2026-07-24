import { get, post } from './controller.js'
import { options } from './options.js'

export const checkAnswers = {
  plugin: {
    name: 'checkAnswers',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/check-answers',
          ...get
        },
        {
          method: 'POST',
          path: '/check-answers',
          ...post,
          ...options
        }
      ])
    }
  }
}
