/// <reference lib="dom" />
import { afterEach, describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick, reactive } from 'vue'
import { useDocumentHead } from '@/ui/composables/useDocumentHead'
import { LATEST_PATCH, type PatchNote } from '@/ui/patchNotes/notes'

const settings = reactive({ locale: 'en' as 'en' | 'ru' })
const notes = reactive({ patch: null as PatchNote | null })

const profile = reactive({
  isOpen: false,
  isCareer: false,
})

const match = reactive({ view: null as object | null })
const replay = reactive({ match: null as object | null })
vi.mock('@/ui/stores/settings', () => ({ useSettingsStore: () => settings }))
vi.mock('@/ui/stores/patchNotes', () => ({ usePatchNotesStore: () => notes }))
vi.mock('@/ui/stores/profile', () => ({ useProfileStore: () => profile }))
vi.mock('@/ui/stores/match', () => ({ useMatchStore: () => match }))
vi.mock('@/ui/stores/replay', () => ({ useReplayStore: () => replay }))

class Element {
  attributes: Record<string, string> = {}
  content = ''
  rel = ''
  href = ''
  removed = false

  setAttribute(key: string, value: string) {
    this.attributes[key] = value
  }

  remove() {
    this.removed = true
  }
}

const scope = effectScope()
afterEach(() => {
  scope.stop()
  vi.unstubAllGlobals()
})

describe('screen indexing rules', () => {
  it('restores public metadata after private screens and follows language and visible-screen precedence', async () => {
    const elements: Element[] = []

    const document = {
      title: '',
      documentElement: { lang: '' },
      createElement: () => new Element(),
      head: { append: (element: Element) => elements.push(element) },
      querySelector: (selector: string) => {
        const attribute = /\[(name|property|rel)="([^"]+)"\]/.exec(selector)!
        return (
          elements.find(
            (element) =>
              !element.removed &&
              (attribute[1] === 'rel' ? element.rel : element.attributes[attribute[1]!]) === attribute[2],
          ) ?? null
        )
      },
    }

    const robots = () => document.querySelector('meta[name="robots"]')?.content
    const canonical = () => document.querySelector('link[rel="canonical"]')?.href
    vi.stubGlobal('document', document)
    scope.run(useDocumentHead)
    expect(robots()).toBe('index, follow')
    expect(canonical()).toBe('https://theshotcaller.online/')

    profile.isOpen = true
    await nextTick()
    expect(robots()).toBe('noindex, nofollow')
    expect(document.title).toBe('Profile · The Shotcaller')
    expect(canonical()).toBeUndefined()

    profile.isCareer = true
    await nextTick()
    expect(document.title).toBe('Career · The Shotcaller')
    match.view = {}
    await nextTick()
    expect(document.title).toBe('Match · The Shotcaller')

    notes.patch = LATEST_PATCH
    await nextTick()
    expect(robots()).toBe('index, follow')
    expect(canonical()).toBe(`https://theshotcaller.online/patches/${LATEST_PATCH.version}/`)
    settings.locale = 'ru'
    await nextTick()
    expect(document.documentElement.lang).toBe('ru')
    expect(document.title).toContain(`Патч ${LATEST_PATCH.version}`)

    replay.match = {}
    await nextTick()
    expect(robots()).toBe('noindex, nofollow')
    expect(canonical()).toBeUndefined()
  })
})
