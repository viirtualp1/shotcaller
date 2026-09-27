import { describe, expect, it } from 'vitest'
import { LATEST_PATCH, PATCH_NOTES, type NoteText } from '@/ui/patchNotes/notes'
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

  it('uses real calendar dates', () => {
    for (const patch of PATCH_NOTES) {
      expect(patch.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(new Date(patch.date).toISOString().slice(0, 10)).toBe(patch.date)
    }
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
