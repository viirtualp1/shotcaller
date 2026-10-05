import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { assetLinks, readTwaManifest } from '../../scripts/assetLinks'

const twa = readTwaManifest()
const gradle = readFileSync('android/app/build.gradle', 'utf8')

describe('Android app', () => {
  it('builds the version the Bubblewrap manifest names', () => {
    // The app shows the live site, so game updates need no new build; this version moves only with the wrapper.
    expect(gradle).toContain(`versionCode ${twa.appVersionCode}`)
    expect(gradle).toContain(`versionName "${twa.appVersionName}"`)
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
