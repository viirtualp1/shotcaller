import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Plugin } from 'vite'

interface PackageNotice {
  readonly name: string
  readonly version: string
  readonly license: string
  readonly homepage: string | null
  readonly texts: readonly string[]
}

export const NOTICES_FILE = 'third-party-notices.txt'

/* License, licence, copying and notice files, in any case and with any extension. */
const NOTICE_FILE = /^(licen[cs]e|copying|notice)([.-].*)?$/i

/** The package a bundled file comes from: `node_modules/name` or `node_modules/@scope/name`. */
export function packageRoot(id: string) {
  const path = id.replace(/\\/g, '/').split('?')[0]!
  const at = path.lastIndexOf('/node_modules/')
  if (at < 0) {
    return null
  }

  const rest = path.slice(at + '/node_modules/'.length).split('/')
  const depth = rest[0]?.startsWith('@') ? 2 : 1
  if (rest.length <= depth) {
    return null
  }

  return path.slice(0, at) + '/node_modules/' + rest.slice(0, depth).join('/')
}

function readNotice(root: string): PackageNotice | null {
  const manifest = join(root, 'package.json')
  if (!existsSync(manifest)) {
    return null
  }

  const pkg = JSON.parse(readFileSync(manifest, 'utf8')) as {
    name?: string
    version?: string
    license?: string | { type?: string }
    homepage?: string
    repository?: string | { url?: string }
  }

  const license = typeof pkg.license === 'string' ? pkg.license : (pkg.license?.type ?? 'UNKNOWN')
  const repository = typeof pkg.repository === 'string' ? pkg.repository : pkg.repository?.url

  const texts = readdirSync(root)
    .filter((file) => NOTICE_FILE.test(file))
    .sort()
    .map((file) => readFileSync(join(root, file), 'utf8').trim())

  return {
    name: pkg.name ?? root.split('/').pop()!,
    version: pkg.version ?? '',
    license,
    homepage: pkg.homepage ?? repository ?? null,
    texts,
  }
}

export function renderNotices(notices: readonly PackageNotice[]) {
  const header = [
    'The Shotcaller includes the following third-party software.',
    'Each package is listed with its license and the notices its authors ask to keep with copies of it.',
    'Audio sources and their licenses are listed in /audio/CREDITS.md.',
  ].join('\n')

  const entries = notices.map((notice) =>
    [
      `${notice.name}${notice.version ? ` ${notice.version}` : ''}`,
      `License: ${notice.license}`,
      ...(notice.homepage ? [`Source: ${notice.homepage}`] : []),
      '',
      notice.texts.length ? notice.texts.join('\n\n') : `Released under the ${notice.license} license.`,
    ].join('\n'),
  )

  return [header, ...entries].join(`\n\n${'-'.repeat(78)}\n\n`) + '\n'
}

/**
 * Writes the licenses of every package that ends up in the production build to `third-party-notices.txt`, so the
 * notices permissive licenses ask to keep travel with the game.
 */
export function thirdPartyNotices(): Plugin {
  return {
    name: 'third-party-notices',
    apply: 'build',
    generateBundle() {
      const roots = new Set<string>()
      for (const id of this.getModuleIds()) {
        const root = packageRoot(id)
        if (root) {
          roots.add(root)
        }
      }

      const notices = [...roots]
        .map(readNotice)
        .filter((notice): notice is PackageNotice => notice !== null)
        .sort((a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version))

      this.emitFile({
        type: 'asset',
        fileName: NOTICES_FILE,
        source: renderNotices(notices),
      })
    },
  }
}
