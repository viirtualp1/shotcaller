import { describe, expect, it } from 'vitest'
import { LATEST_PATCH, PATCH_NOTES, findPatch, isNewerVersion, type NoteText } from '@/ui/patchNotes/notes'
import { versionFromPath } from '@/ui/stores/patchNotes'
import { patchSnippet } from '@/ui/patchNotes/seo'
import pkg from '../../package.json'

const isNoteText = (value: unknown): value is NoteText =>
  typeof value === 'object' && value !== null && 'en' in value && 'ru' in value

function texts(value: unknown): NoteText[] {
  if (isNoteText(value)) {
    return [value]
  }

  if (typeof value === 'object' && value !== null) {
    return Object.values(value).flatMap(texts)
  }

  return []
}

const highlights = (line: string) => line.split('**').length - 1
const versionKey = (version: string) => version.split('.').map(Number)

describe('patch notes', () => {
  it('lists patches newest first, ending with the current version', () => {
    const versions = PATCH_NOTES.map((p) => p.version)

    const sorted = [...versions].sort((a, b) => {
      const [x, y] = [versionKey(a), versionKey(b)]
      return (y[0]! - x[0]!) * 1_000_000 + (y[1]! - x[1]!) * 1000 + ((y[2] ?? 0) - (x[2] ?? 0))
    })

    expect(versions).toEqual(sorted)
    expect(new Set(versions).size).toBe(versions.length)
    expect([LATEST_PATCH.version, `${LATEST_PATCH.version}.0`]).toContain(pkg.version)
  })

  it('keeps a link to a patch newer than this client instead of opening the previous one', () => {
    const [major = 0, minor = 0] = LATEST_PATCH.version.split('.').map(Number)
    const newer = `${major}.${minor + 1}`

    expect(isNewerVersion(newer, LATEST_PATCH.version)).toBe(true)
    expect(isNewerVersion(LATEST_PATCH.version, newer)).toBe(false)
    expect(isNewerVersion(LATEST_PATCH.version, LATEST_PATCH.version)).toBe(false)
    expect(isNewerVersion('nope', LATEST_PATCH.version)).toBe(false)

    expect(versionFromPath(`/patches/${newer}`)).toBe(newer)
    expect(versionFromPath(`/patches/${newer}/`)).toBe(newer)
    expect(versionFromPath('/patches/0.1')).toBe(LATEST_PATCH.version)
    expect(versionFromPath('/patches/')).toBe(LATEST_PATCH.version)
    expect(versionFromPath('/')).toBeNull()
  })

  it('uses real calendar dates', () => {
    for (const patch of PATCH_NOTES) {
      expect(patch.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(new Date(patch.date).toISOString().slice(0, 10)).toBe(patch.date)
    }
  })

  it('describes a patch with a short list of its changes', () => {
    const latest = findPatch('8.4.1')!
    const pages = findPatch('8.4')!
    const modes = findPatch('8.0')!

    for (const locale of ['en', 'ru'] as const) {
      const snippet = patchSnippet(latest, locale)
      expect(snippet.length).toBeLessThanOrEqual(160)
      expect(snippet).not.toContain('**')
      expect(snippet.split(' · ').length).toBeGreaterThan(1)
    }

    expect(patchSnippet(latest, 'en')).toContain('damage taken sits beside damage and healing')
    expect(patchSnippet(latest, 'en')).toMatch(/Bug fixes$/)
    expect(patchSnippet(latest, 'ru')).toMatch(/Исправления$/)
    expect(patchSnippet(latest, 'en')).not.toContain('past the sides of the bridge')

    const ring = findPatch('8.4.2')!
    expect(patchSnippet(ring, 'en')).toContain('only your heroes')
    expect(patchSnippet(ring, 'en')).toMatch(/Bug fixes$/)
    expect(patchSnippet(ring, 'en')).not.toContain('selection ring')
    expect(patchSnippet(ring, 'ru')).toMatch(/Исправления$/)
    expect(patchSnippet(ring, 'en').length).toBeLessThanOrEqual(160)
    expect(patchSnippet(ring, 'ru').length).toBeLessThanOrEqual(160)
    expect(patchSnippet(pages, 'en')).not.toContain('Bug fixes')
    expect(patchSnippet(modes, 'en').length).toBeLessThanOrEqual(160)
    expect(patchSnippet(modes, 'en')).toContain('Three ways to play')
    expect(patchSnippet(modes, 'en')).toMatch(/Bug fixes$/)
    expect(patchSnippet(modes, 'en')).not.toContain('Hand-lettered titles')
  })

  it('has every line in both languages with matching highlights', () => {
    for (const line of texts(PATCH_NOTES)) {
      expect(line.en.trim()).not.toBe('')
      expect(line.ru.trim()).not.toBe('')
      expect(highlights(line.en) % 2, line.en).toBe(0)
      expect(highlights(line.ru), line.ru).toBe(highlights(line.en))
    }
  })
})
