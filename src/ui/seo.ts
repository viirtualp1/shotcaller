import type { Locale } from './i18n/index.ts'
import type { PatchNote } from './patchNotes/notes.ts'

export const SITE_ORIGIN = 'https://theshotcaller.online'
export const SITE_NAME = 'The Shotcaller'
export const patchPath = (version: string) => `/patches/${version}/`

export const HOME_DESCRIPTION = {
  en: 'Play The Shotcaller, a free browser strategy game. Draft heroes, build synergies, command three lanes and challenge friends to a duel.',
  ru: 'The Shotcaller — бесплатная стратегия в браузере. Собирай героев и синергии, управляй тремя линиями и вызывай друзей на дуэль.',
} as const

const plain = (text: string) => text.replaceAll('**', '').replace(/\s+/g, ' ').trim()

/** Shared by the delivered HTML and the app, so previews and page metadata agree. */
export function patchSnippet(patch: PatchNote, locale: Locale) {
  const lines = [
    ...(patch.features ?? []).flatMap((feature) => [feature.title[locale], feature.text[locale]]),
    ...(patch.general ?? []).map((line) => line[locale]),
    ...(patch.items ?? []).flatMap((entry) => entry.changes.map((line) => line[locale])),
    ...(patch.roles ?? []).flatMap((entry) => entry.changes.map((line) => line[locale])),
    ...(patch.heroes ?? []).flatMap((entry) => [
      ...entry.changes.map((line) => line[locale]),
      ...(entry.abilities ?? []).flatMap((ability) => ability.changes.map((line) => line[locale])),
    ]),
    ...(patch.interface ?? []).map((line) => line[locale]),
  ]

  const fixes = patch.fixes?.length ? (locale === 'ru' ? 'Исправления' : 'Bug fixes') : ''
  const room = 160 - (fixes ? fixes.length + 3 : 0)
  let text = ''
  for (const raw of lines) {
    const line = plain(raw)
    const next = text ? `${text} · ${line}` : line
    if (next.length > room) {
      if (!text) {
        text = `${line.slice(0, room - 1).trimEnd()}…`
      }

      break
    }

    text = next
  }

  return (fixes ? `${text ? `${text} · ` : ''}${fixes}` : text) || plain(patch.title[locale])
}

export function patchTitle(patch: PatchNote, locale: Locale) {
  return `${locale === 'ru' ? 'Патч' : 'Patch'} ${patch.version} — ${plain(patch.title[locale])} · ${SITE_NAME}`
}

export const PRIVATE_DESCRIPTIONS = {
  profile: {
    en: 'Your coach profile, match history and progress in The Shotcaller.',
    ru: 'Профиль тренера, история матчей и прогресс в The Shotcaller.',
  },
  career: {
    en: 'Your trials, weekly contracts and milestones in The Shotcaller.',
    ru: 'Твои испытания, недельные контракты и достижения в The Shotcaller.',
  },
  game: {
    en: 'Your match in The Shotcaller.',
    ru: 'Твой матч в The Shotcaller.',
  },
  replay: {
    en: 'Your match replay in The Shotcaller.',
    ru: 'Повтор твоего матча в The Shotcaller.',
  },
} as const
