import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const vercel: { headers: { headers: { key: string; value: string }[] }[] } = JSON.parse(
  readFileSync('vercel.json', 'utf8'),
)

const policy = vercel.headers
  .flatMap((rule) => rule.headers)
  .find((h) => h.key === 'Content-Security-Policy')!.value

const directive = (name: string) =>
  policy
    .split(';')
    .map((part) => part.trim().split(/\s+/))
    .find(([key]) => key === name)
    ?.slice(1) ?? []

/** Text of every inline `<script>` in the page. External scripts carry a `src` and are not hashed. */
function inlineScripts(html: string) {
  const bodies: string[] = []
  const source = html.toLowerCase()
  let cursor = 0

  while (cursor < html.length) {
    const open = source.indexOf('<script', cursor)

    if (open === -1) {
      break
    }

    const nameEnd = open + '<script'.length
    const boundary = source[nameEnd]

    if (boundary !== undefined && boundary >= 'a' && boundary <= 'z') {
      cursor = nameEnd

      continue
    }

    const tagEnd = html.indexOf('>', open)
    const close = tagEnd === -1 ? -1 : source.indexOf('</script', tagEnd)

    if (tagEnd === -1 || close === -1) {
      break
    }

    const tag = source.slice(nameEnd, tagEnd)

    if (!tag.split(/\s+/).some((part) => part.startsWith('src='))) {
      bodies.push(html.slice(tagEnd + 1, close))
    }

    const after = html.indexOf('>', close)
    cursor = after === -1 ? html.length : after + 1
  }

  return bodies
}

describe('content security policy', () => {
  it('allows every inline script of the page by its hash and nothing else inline', () => {
    const html = readFileSync('index.html', 'utf8')

    const inline = inlineScripts(html).map(
      (code) => `'sha256-${createHash('sha256').update(code).digest('base64')}'`,
    )

    expect(inline.length).toBeGreaterThan(0)
    expect(directive('script-src')).toEqual(["'self'", ...inline])
  })

  it('keeps eval, plugins and foreign frames out', () => {
    expect(policy).not.toContain("'unsafe-eval'")
    expect(directive('object-src')).toEqual(["'none'"])
    expect(directive('frame-ancestors')).toContain("'self'")
  })
})
