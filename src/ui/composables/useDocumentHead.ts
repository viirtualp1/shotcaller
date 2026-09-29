import { watch } from 'vue'
import { i18n } from '../i18n'
import { patchSnippet } from '../patchNotes/seo'
import { usePatchNotesStore } from '../stores/patchNotes'
import { useSettingsStore } from '../stores/settings'

const description = () => document.querySelector('meta[name="description"]')

/** The home-page description, put back when a patch page closes. */
const homeDescription = description()?.getAttribute('content') ?? ''

/** The tab title and the search description follow the open patch. */
export function useDocumentHead() {
  const settings = useSettingsStore()
  const patchNotes = usePatchNotesStore()

  watch(
    [() => patchNotes.patch, () => settings.locale],
    () => {
      const patch = patchNotes.patch
      const meta = description()

      if (!patch) {
        document.title = i18n.global.t('app.title')
        meta?.setAttribute('content', homeDescription)
        return
      }

      const version = i18n.global.t('patchNotes.patch', { version: patch.version })
      document.title = `${version} — ${patch.title[settings.locale]} · ${i18n.global.t('app.title')}`
      meta?.setAttribute('content', patchSnippet(patch, settings.locale))
    },
    { immediate: true },
  )
}
