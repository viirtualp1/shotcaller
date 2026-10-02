import { createI18n } from 'vue-i18n'
import en from './locales/en.json'
import ru from './locales/ru.json'

export const LOCALES = ['ru', 'en'] as const
export type Locale = (typeof LOCALES)[number]
export type MessageSchema = typeof ru

export const LOCALE_LABELS: Readonly<Record<Locale, string>> = {
  ru: 'Русский',
  en: 'English',
}

const russianPlural = new Intl.PluralRules('ru')

const PLURAL_INDEX: Readonly<Record<Intl.LDMLPluralRule, number>> = {
  zero: 2,
  one: 0,
  two: 1,
  few: 1,
  many: 2,
  other: 2,
}

export const isLocale = (value: unknown): value is Locale => LOCALES.includes(value as Locale)

export function detectLocale() {
  const preferred = globalThis.navigator?.language?.toLowerCase() ?? ''
  return preferred.startsWith('ru') ? 'ru' : 'en'
}

/** The Vite i18n plugin enforces Composition API mode with `compositionOnly: true`. */
export const i18n = createI18n<[MessageSchema], Locale, false>({
  locale: detectLocale(),
  fallbackLocale: 'en',
  messages: {
    ru,
    en,
  },
  pluralRules: {
    ru: (choice, choicesLength) => Math.min(PLURAL_INDEX[russianPlural.select(choice)], choicesLength - 1),
  },
})

const numberFormats = new Map<string, Intl.NumberFormat>()

/** One decimal by default; attack times use two, so 0.88 s does not read as 0.9 s. */
export function formatNumber(locale: string, value: number, digits = 1) {
  const key = isLocale(locale) ? locale : 'en'
  let format = numberFormats.get(`${key}:${digits}`)
  if (!format) {
    format = new Intl.NumberFormat(key === 'ru' ? 'ru-RU' : 'en-US', { maximumFractionDigits: digits })
    numberFormats.set(`${key}:${digits}`, format)
  }

  return format.format(value)
}
