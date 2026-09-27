import { describe, expect, it } from 'vitest'
import { migrateLegacyStorage, STORAGE_KEYS } from '@/application/persistence/storageKeys'

function memoryStorage(entries: Record<string, string>) {
  const data = new Map(Object.entries(entries))
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  }
}

describe('migrateLegacyStorage', () => {
  it('moves values saved under the old game name', () => {
    const storage = memoryStorage({
      'tri-linii/match': '{"round":4}',
      'tri-linii/locale': 'en',
    })

    migrateLegacyStorage(storage)
    expect(storage.data.get(STORAGE_KEYS.match)).toBe('{"round":4}')
    expect(storage.data.get(STORAGE_KEYS.locale)).toBe('en')
    expect(storage.data.has('tri-linii/match')).toBe(false)
  })

  it('keeps values already saved under the new name', () => {
    const storage = memoryStorage({
      'tri-linii/locale': 'en',
      [STORAGE_KEYS.locale]: 'ru',
    })

    migrateLegacyStorage(storage)
    expect(storage.data.get(STORAGE_KEYS.locale)).toBe('ru')
    expect(storage.data.has('tri-linii/locale')).toBe(false)
  })
})
