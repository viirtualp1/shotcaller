import path from 'node:path'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { bundleFile, contentType, securityHeaders, type HostingConfig } from '../../electron/bundle'
import { APP_ORIGIN, isAppUrl, isExternalUrl } from '../../electron/origin'

const root = path.resolve('dist-desktop')

describe('desktop bundle', () => {
  it('serves files from the bundle and the game for every page', () => {
    expect(bundleFile(root, `${APP_ORIGIN}/assets/index.js`)).toBe(path.join(root, 'assets', 'index.js'))
    expect(bundleFile(root, `${APP_ORIGIN}/`)).toBe(path.join(root, 'index.html'))
    expect(bundleFile(root, `${APP_ORIGIN}/leaderboard/two-lanes`)).toBe(path.join(root, 'index.html'))
  })

  it('refuses paths that leave the bundle and other hosts', () => {
    expect(bundleFile(root, `${APP_ORIGIN}/..%2Fpackage.json`)).toBeNull()
    expect(bundleFile(root, `${APP_ORIGIN}/..%5Cpackage.json`)).toBeNull()
    expect(bundleFile(root, `${APP_ORIGIN}/%E0%A4%A.js`)).toBeNull()
    expect(bundleFile(root, 'app://elsewhere/index.html')).toBeNull()
  })

  it('names the content type the game files need', () => {
    expect(contentType('index.html')).toBe('text/html; charset=utf-8')
    expect(contentType('chunk.JS')).toBe('text/javascript; charset=utf-8')
    expect(contentType('hit.ogg')).toBe('audio/ogg')
    expect(contentType('unknown.bin')).toBe('application/octet-stream')
  })

  it('runs under the same security headers as the website', () => {
    const config = JSON.parse(readFileSync('vercel.json', 'utf8')) as HostingConfig
    const headers = securityHeaders(config)

    expect(headers['Content-Security-Policy']).toContain("default-src 'self'")
    expect(headers['X-Content-Type-Options']).toBe('nosniff')
  })
})

describe('desktop links', () => {
  it('keeps only the bundled game in the window', () => {
    expect(isAppUrl(`${APP_ORIGIN}/profile`)).toBe(true)
    expect(isAppUrl('https://theshotcaller.online/')).toBe(false)
    expect(isAppUrl('app://elsewhere/')).toBe(false)
    expect(isAppUrl('not a url')).toBe(false)
  })

  it('hands web and mail links to the browser and nothing else', () => {
    expect(isExternalUrl('https://discord.com/oauth2/authorize?client_id=1')).toBe(true)
    expect(isExternalUrl('mailto:support@theshotcaller.online')).toBe(true)
    expect(isExternalUrl('file:///C:/Windows/System32/calc.exe')).toBe(false)
    expect(isExternalUrl('javascript:alert(1)')).toBe(false)
  })
})
