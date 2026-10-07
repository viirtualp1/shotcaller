import { describe, expect, it } from 'vitest'
import { escapeHtml, patchArticle } from '../../scripts/seoPlugin'
import { LATEST_PATCH, PATCH_NOTES } from '@/ui/patchNotes/notes'
import { APP_PAGE_PATHS, leaderboardPath, modeFromSlug, patchSnippet, patchPath, patchTitle } from '@/ui/seo'

describe('public page SEO', () => {
  it('gives each patch a distinct crawlable URL, title and short description', () => {
    expect(new Set(PATCH_NOTES.map((patch) => patchPath(patch.version))).size).toBe(PATCH_NOTES.length)

    for (const patch of PATCH_NOTES) {
      expect(patchPath(patch.version)).not.toContain('#')

      for (const locale of ['en', 'ru'] as const) {
        expect(patchTitle(patch, locale)).toContain(patch.version)
        expect(patchSnippet(patch, locale).length).toBeGreaterThan(0)
        expect(patchSnippet(patch, locale).length).toBeLessThanOrEqual(160)
        expect(patchSnippet(patch, locale)).not.toContain('**')
      }
    }
  })

  it('delivers readable patch content and crawlable adjacent links before JavaScript', () => {
    const html = patchArticle(LATEST_PATCH)
    const previous = PATCH_NOTES[1]!

    expect(html).toContain(`<h1>Patch ${LATEST_PATCH.version}`)
    expect(html).toContain(escapeHtml(LATEST_PATCH.title.en))
    const firstLine = [...(LATEST_PATCH.general ?? []), ...(LATEST_PATCH.fixes ?? [])][0]!
    expect(html).toContain(escapeHtml(firstLine.en.replaceAll('**', '')))
    expect(html).toContain(`href="${patchPath(previous.version)}"`)
    expect(html).not.toContain('#/patches')
    expect(html).toContain('href="/"')
  })

  it('spells app page URLs in kebab-case and still opens old camelCase links', () => {
    expect(leaderboardPath('threeLanes')).toBe('/leaderboard/three-lanes')
    expect(modeFromSlug('one-lane')).toBe('oneLane')
    expect(modeFromSlug('twoLanes')).toBe('twoLanes')
    expect(modeFromSlug('four-lanes')).toBeNull()

    for (const path of APP_PAGE_PATHS) {
      expect(path).toMatch(/^\/[a-z-]+(?:\/[a-z-]+)?$/)
    }
  })

  it('includes each faction and both bonus thresholds in the static release article', () => {
    const html = patchArticle(LATEST_PATCH)
    expect(LATEST_PATCH.factions).toHaveLength(5)

    for (const faction of LATEST_PATCH.factions ?? []) {
      expect(html).toContain(escapeHtml(faction.name.en))
      expect(html).toContain(escapeHtml(faction.pair.en.replaceAll('**', '')))
      expect(html).toContain(escapeHtml(faction.trio.en.replaceAll('**', '')))
    }
  })

  it('escapes note text and attribute values', () => {
    expect(escapeHtml('<script a="x">&\'</script>')).toBe(
      '&lt;script a=&quot;x&quot;&gt;&amp;&#39;&lt;/script&gt;',
    )

    const html = patchArticle({
      ...LATEST_PATCH,
      title: {
        en: '<script>bad</script>',
        ru: '',
      },
      general: [
        {
          en: '<img src=x onerror="bad()">',
          ru: '',
        },
      ],
    })

    expect(html).not.toContain('<script>')
    expect(html).not.toContain('<img')
  })
})
