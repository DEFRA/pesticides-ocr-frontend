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

  return {
    assetPath: `${assetPath}/assets`,
    serviceName: config.get('serviceName'),
    serviceUrl: '/',
    // Google Tag Manager + cookie banner (EQ-388/EQ-363) render only when
    // analytics is enabled — production by default, or ANALYTICS_ENABLED=true to
    // exercise it locally. The container id is config-driven (per environment).
    analyticsEnabled: config.get('analytics.enabled'),
    analyticsGtmId: config.get('analytics.gtmId'),
    breadcrumbs: [],
    account: buildAccount(request),
    navigation: buildNavigation(request),
    pageTitle: request?.route?.settings?.app?.pageTitle,
    items: request?.route?.settings?.app?.items,
    getAssetPath(asset) {
      if (!config.get('isProduction')) {
        return `${assetPath}/${asset}`
      }

      const viteAssetPath = viteManifest?.[asset]?.file
      return `${assetPath}/${viteAssetPath ?? asset}`
    }
  }
}
