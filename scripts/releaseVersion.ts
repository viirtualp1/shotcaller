import { readFileSync } from 'node:fs'
import type { Plugin } from 'vite'

/** Published alongside the client, but fetched independently of its cached files. */
export function releaseVersionPlugin(): Plugin {
  const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
  const source = JSON.stringify({ version })

  return {
    name: 'release-version',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (request.url?.split('?')[0] !== '/release.json') {
          next()

          return
        }

        response.setHeader('Content-Type', 'application/json')
        response.setHeader('Cache-Control', 'no-store')
        response.end(source)
      })
    },
    configurePreviewServer(server) {
      server.middlewares.use((request, response, next) => {
        if (request.url?.split('?')[0] === '/release.json') {
          response.setHeader('Cache-Control', 'no-store')
        }

        next()
      })
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'release.json',
        source,
      })
    },
  }
}
