import { watch } from 'vue'
import {
  HOME_DESCRIPTION,
  patchPath,
  patchSnippet,
  patchTitle,
  PRIVATE_DESCRIPTIONS,
  SITE_NAME,
  SITE_ORIGIN,
} from '../seo'
import { useMatchStore } from '../stores/match'
import { usePatchNotesStore } from '../stores/patchNotes'
import { useProfileStore } from '../stores/profile'
import { useReplayStore } from '../stores/replay'
import { useSettingsStore } from '../stores/settings'
import { useLeaderboardStore } from '../stores/leaderboard'
import { useLegalStore } from '../stores/legal'
import { legalPath } from '../legal/documents'

function meta(attribute: 'name' | 'property', name: string, content: string) {
  let element = document.querySelector<HTMLMetaElement>(`meta[${attribute}="${name}"]`)
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attribute, name)
    document.head.append(element)
  }

  element.content = content
}

/** Public pages describe their content; personal screens never advertise a player's data. */
export function useDocumentHead() {
  const settings = useSettingsStore()
  const notes = usePatchNotesStore()
  const profile = useProfileStore()
  const match = useMatchStore()
  const replay = useReplayStore()
  const leaderboard = useLeaderboardStore()
  const legal = useLegalStore()

  watch(
    [
      () => notes.patch,
      () => notes.awaitingUpdate,
      () => notes.requestedVersion,
      () => settings.locale,
      () => profile.isOpen,
      () => profile.isCareer,
      () => match.view !== null,
      () => replay.match !== null,
      () => leaderboard.isOpen,
      () => legal.document,
    ],
    () => {
      const locale = settings.locale
      const patch = notes.patch
      const missingVersion = notes.awaitingUpdate ? notes.requestedVersion : null
      const legalDocument = legal.document

      const personal = replay.match
        ? 'replay'
        : patch || missingVersion || legalDocument
          ? null
          : leaderboard.isOpen
            ? 'leaderboard'
            : match.view
              ? 'game'
              : profile.isCareer
                ? 'career'
                : profile.isOpen
                  ? 'profile'
                  : null

      const labels =
        locale === 'ru'
          ? {
              game: 'Матч',
              replay: 'Повтор',
              profile: 'Профиль',
              career: 'Карьера',
              leaderboard: 'Таблица лидеров',
            }
          : {
              game: 'Match',
              replay: 'Replay',
              profile: 'Profile',
              career: 'Career',
              leaderboard: 'Leaderboard',
            }

      const title = personal
        ? `${labels[personal]} · ${SITE_NAME}`
        : legalDocument
          ? `${legalDocument.title[locale]} · ${SITE_NAME}`
          : missingVersion
            ? `${locale === 'ru' ? 'Патч' : 'Patch'} ${missingVersion} · ${SITE_NAME}`
            : patch
              ? patchTitle(patch, locale)
              : `${SITE_NAME} — ${locale === 'ru' ? 'Бесплатная стратегия в браузере' : 'Free browser strategy game'}`

      const description = personal
        ? PRIVATE_DESCRIPTIONS[personal][locale]
        : legalDocument
          ? legalDocument.summary[locale]
          : patch
            ? patchSnippet(patch, locale)
            : HOME_DESCRIPTION[locale]

      document.title = title
      document.documentElement.lang = locale
      meta('name', 'description', description)
      meta('name', 'robots', personal || missingVersion ? 'noindex, nofollow' : 'index, follow')
      meta('property', 'og:title', title)
      meta('property', 'og:description', description)
      meta('property', 'og:locale', locale === 'ru' ? 'ru_RU' : 'en_US')
      const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
      if (personal) {
        canonical?.remove()
        document.querySelector('meta[property="og:url"]')?.remove()
      } else {
        const path = legalDocument
          ? legalPath(legalDocument.id)
          : missingVersion
            ? patchPath(missingVersion)
            : patch
              ? patchPath(patch.version)
              : '/'

        const url = `${SITE_ORIGIN}${path}`
        const link = canonical ?? document.createElement('link')
        link.rel = 'canonical'
        link.href = url

        if (!canonical) {
          document.head.append(link)
        }

        meta('property', 'og:url', url)
      }
    },
    { immediate: true },
  )
}
