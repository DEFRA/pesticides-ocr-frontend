import path from 'node:path'
import { readFileSync } from 'node:fs'

import { buildAccount } from '@defra/hapi-oidc-auth'

import { config } from '#/config/config.js'
import { buildNavigation } from './build-navigation.js'
import { createLogger } from '#/server/common/helpers/logging/logger.js'

const logger = createLogger()
const assetPath = config.get('assetPath')
const manifestPath = path.join(
  config.get('root'),
  '.public/.vite/manifest.json'
)

let viteManifest

export function context(request) {
  if (config.get('isProduction') && !viteManifest) {
    try {
      viteManifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
    } catch (error) {
      logger.error(`Vite ${path.basename(manifestPath)} not found`)
    }
  }

  const account = buildAccount(request)
  // In mock mode (local demo / UCD) the plugin returns a generic demo identity;
  // show a friendlier demo name. Live mode keeps the real signed-in name.
  if (account && config.get('entra.mode') === 'mock') {
    account.name = 'Ulysses Alvarez'
  }

  return {
    assetPath: `${assetPath}/assets`,
    serviceName: config.get('serviceName'),
    serviceUrl: '/',
    breadcrumbs: [],
    account,
    navigation: buildNavigation(request),
    pageTitle: request?.route?.settings?.app?.pageTitle,
    getAssetPath(asset) {
      if (!config.get('isProduction')) {
        return `${assetPath}/${asset}`
      }

      const viteAssetPath = viteManifest?.[asset]?.file
      return `${assetPath}/${viteAssetPath ?? asset}`
    }
  }
}
