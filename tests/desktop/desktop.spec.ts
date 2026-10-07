import path from 'node:path'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { bundleFile, contentType, securityHeaders, type HostingConfig } from '../../electron/bundle'
import { achievementNames } from '../../electron/achievementNames'
import { APP_ORIGIN, isAppUrl, isExternalUrl } from '../../electron/origin'
import { isFullscreenToggle, readWindowState } from '../../electron/windowState'

const root = path.resolve('dist-desktop')

describe('desktop bundle', () => {
  it('serves files from the bundle and the game for every page', () => {
    expect(bundleFile(root, `${APP_ORIGIN}/assets/index.js`)).toBe(path.join(root, 'assets', 'index.js'))
    expect(bundleFile(root, `${APP_ORIGIN}/assets%5Cindex.js`)).toBe(path.join(root, 'assets', 'index.js'))
    expect(bundleFile(root, `${APP_ORIGIN}/`)).toBe(path.join(root, 'index.html'))
    expect(bundleFile(root, `${APP_ORIGIN}/leaderboard/two-lanes`)).toBe(path.join(root, 'index.html'))
  })

  it.each([
    '..%2Fpackage.json',
    '..%5Cpackage.json',
    'assets%2F..%5C..%2Fpackage.json',
    'assets%5C..%2F..%5Cpackage.json',
    '..%2Fprivate',
    '..%5Cprivate',
    '..%5Cdist-desktop-other%5Cpackage.json',
  ])('refuses traversal with either separator: %s', (pathname) => {
    expect(bundleFile(root, `${APP_ORIGIN}/${pathname}`)).toBeNull()
  })

  it('refuses paths that leave the bundle and other hosts', () => {
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

describe('desktop window', () => {
  it('opens fullscreen until the player chooses a window', () => {
    expect(readWindowState(null)).toEqual({ fullscreen: true })
    expect(readWindowState('{"fullscreen":false}')).toEqual({ fullscreen: false })
    expect(readWindowState('{"fullscreen":"no"}')).toEqual({ fullscreen: true })
    expect(readWindowState('not json')).toEqual({ fullscreen: true })
  })

  it('toggles fullscreen with F11 and Alt+Enter', () => {
    const key = (name: string, alt = false) =>
      isFullscreenToggle({
        key: name,
        alt,
      })

    expect(key('F11')).toBe(true)
    expect(key('Enter', true)).toBe(true)
    expect(key('Enter')).toBe(false)
  })
})

describe('desktop Steam bridge', () => {
  it('passes on only Steam achievement names from the game window', () => {
    expect(achievementNames(['FIRST_WIN', 'FIRST_WIN', 'bad name', 42, 'WINS_50'])).toEqual([
      'FIRST_WIN',
      'WINS_50',
    ])

    expect(achievementNames('FIRST_WIN')).toEqual([])
  })
})
