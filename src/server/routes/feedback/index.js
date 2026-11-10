import { getFeedback, getThankYou } from './controller.js'

export const feedback = {
  plugin: {
    name: 'feedback',
    register(server) {
      server.route([
        { method: 'GET', path: '/feedback', ...getFeedback },
        { method: 'GET', path: '/feedback/thank-you', ...getThankYou }
      ])
    }
  }
}
