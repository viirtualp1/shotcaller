import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { assetLinks, readTwaManifest } from '../../scripts/assetLinks'

const twa = readTwaManifest()
const packageVersion = (JSON.parse(readFileSync('package.json', 'utf8')) as { version: string }).version

describe('Android app', () => {
  it('ships the same version as the game, with a code that grows with it', () => {
    const [major = 0, minor = 0, patch = 0] = packageVersion.split('.').map(Number)

    expect(twa.appVersionName).toBe(packageVersion)
    expect(twa.appVersionCode).toBe(major * 10_000 + minor * 100 + patch)
  })

  it('opens the host that serves the site, which the apex domain redirects to', () => {
    expect(twa.host).toBe('www.theshotcaller.online')
  })

  it('links the site to the app package with every signing fingerprint', () => {
    const fingerprints = [{ value: 'AA:BB' }, { value: 'CC:DD' }]

    expect(
      assetLinks({
        ...twa,
        fingerprints,
      }),
    ).toEqual([
      {
        relation: ['delegate_permission/common.handle_all_urls'],
        target: {
          namespace: 'android_app',
          package_name: 'online.theshotcaller.game',
          sha256_cert_fingerprints: ['AA:BB', 'CC:DD'],
        },
      },
    ])
  })
})
