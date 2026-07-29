import { get, post } from './controller.js'
import { app, validate } from './options.js'

export const checkAnswers = {
  plugin: {
    name: 'checkAnswers',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/check-answers',
          ...get,
          options: {
            app
          }
        },
        {
          method: 'POST',
          path: '/check-answers',
          ...post,
          options: {
            app,
            validate
          }
        }
      ])
    }
  }
}
