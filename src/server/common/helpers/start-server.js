import { createServer } from '../../server.js'
import { config } from '#/config/config.js'
import { readFileSync } from 'node:fs'
import { parseEnv } from 'node:util'

function logEnvFile(logger) {
  let contents
  try {
    contents = readFileSync('.env', 'utf8')

    if (contents === '') {
      logger.info('No env overrides found')
      return
    }
  } catch {
    logger.info('No .env file found')
    return
  }

  logger.info(parseEnv(contents), 'Overridden environment variables')
}

async function startServer() {
  const server = await createServer()
  await server.start()

  logEnvFile(server.logger)
  server.logger.info('Server started successfully')

  server.logger.info(
    `Access your frontend on http://localhost:${config.get('port')}`
  )

  return server
}

export { startServer }
