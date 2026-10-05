import { readFileSync } from 'node:fs'
import type { Plugin } from 'vite'

/** The parts of Bubblewrap's `android/twa-manifest.json` the website needs. */
export interface TwaManifest {
  readonly packageId: string
  readonly host: string
  readonly appVersionName: string
  readonly appVersionCode: number
  /** Added by `bubblewrap fingerprint add`: the Play app signing key, and the upload key for local builds. */
  readonly fingerprints: readonly { readonly name?: string; readonly value: string }[]
}

export const ASSET_LINKS_FILE = '.well-known/assetlinks.json'

export const readTwaManifest = (): TwaManifest =>
  JSON.parse(readFileSync(new URL('../android/twa-manifest.json', import.meta.url), 'utf8')) as TwaManifest

/**
 * Digital Asset Links: proof that the Android app and the site belong together, so the app opens the site full
 * screen instead of in a browser tab with an address bar. Android fetches it from the app's host without redirects.
 */
export function assetLinks(twa: TwaManifest) {
  return [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: twa.packageId,
        sha256_cert_fingerprints: twa.fingerprints.map((fingerprint) => fingerprint.value),
      },
    },
  ]
}

export function assetLinksPlugin(): Plugin {
  return {
    name: 'asset-links',
    apply: 'build',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: ASSET_LINKS_FILE,
        source: `${JSON.stringify(assetLinks(readTwaManifest()), null, 2)}\n`,
      })
    },
  }
}
