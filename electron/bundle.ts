import path from 'node:path'
import { APP_HOST } from './origin.js'

const CONTENT_TYPES: Readonly<Record<string, string>> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ogg': 'audio/ogg',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.xml': 'application/xml',
}

export interface HostingConfig {
  readonly headers: readonly {
    readonly headers: readonly { readonly key: string; readonly value: string }[]
  }[]
}

/**
 * The bundled file for a request to the game's origin. A path without an extension is a page of the game, so it gets
 * the game itself; a path that leaves the bundle gets nothing.
 */
export function bundleFile(root: string, url: string) {
  const { host, pathname } = new URL(url)

  if (host !== APP_HOST) {
    return null
  }

  let relative: string

  try {
    relative = decodeURIComponent(pathname).replaceAll('\\', '/')
  } catch {
    return null
  }

  const file = path.resolve(root, `.${relative}`)

  if (file !== root && !file.startsWith(`${root}${path.sep}`)) {
    return null
  }

  return path.extname(relative) === '' ? path.join(root, 'index.html') : file
}

export function contentType(file: string) {
  return CONTENT_TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream'
}

/** The web host's security headers, so the desktop game runs under the same policy as the site. */
export function securityHeaders(config: HostingConfig) {
  return Object.fromEntries(
    config.headers.flatMap((rule) => rule.headers.map((header) => [header.key, header.value])),
  )
}
