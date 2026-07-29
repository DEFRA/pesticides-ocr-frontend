import { homeController } from './controller.js'
import { app } from './options.js'

export const home = {
  plugin: {
    name: 'home',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/',
          ...homeController,
          options: {
            app
          }
        }
      ])
    }
  }
}
