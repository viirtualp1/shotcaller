import { describe, expect, it } from 'vitest'
import { escapeHtml, patchArticle } from '../../scripts/seoPlugin'
import { LATEST_PATCH, PATCH_NOTES } from '@/ui/patchNotes/notes'
import { patchSnippet, patchPath, patchTitle } from '@/ui/seo'

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
    expect(html).toContain(escapeHtml(LATEST_PATCH.general![0]!.en.replaceAll('**', '')))
    expect(html).toContain(`href="${patchPath(previous.version)}"`)
    expect(html).not.toContain('#/patches')
    expect(html).toContain('href="/"')
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
