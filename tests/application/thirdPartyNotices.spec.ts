import { describe, expect, it } from 'vitest'
import { packageRoot, renderNotices } from '../../scripts/thirdPartyNotices'

describe('third-party notices', () => {
  it('finds the package a bundled file comes from, scoped or not, on any platform', () => {
    expect(packageRoot('/app/node_modules/vue/dist/vue.runtime.esm-bundler.js')).toBe('/app/node_modules/vue')

    expect(packageRoot('C:\\app\\node_modules\\@supabase\\auth-js\\dist\\module\\index.js')).toBe(
      'C:/app/node_modules/@supabase/auth-js',
    )

    expect(packageRoot('/app/node_modules/a/node_modules/b/index.js?commonjs-proxy')).toBe(
      '/app/node_modules/a/node_modules/b',
    )

    expect(packageRoot('/app/src/main.ts')).toBeNull()
  })

  it('keeps each license text, and names the license when a package ships none', () => {
    const text = renderNotices([
      {
        name: 'with-text',
        version: '1.0.0',
        license: 'MIT',
        homepage: 'https://example.com',
        texts: ['Copyright (c) Someone'],
      },
      {
        name: 'without-text',
        version: '2.0.0',
        license: 'ISC',
        homepage: null,
        texts: [],
      },
    ])

    expect(text).toContain(
      'with-text 1.0.0\nLicense: MIT\nSource: https://example.com\n\nCopyright (c) Someone',
    )

    expect(text).toContain('without-text 2.0.0\nLicense: ISC\n\nReleased under the ISC license.')
  })
})
