import { HEROES } from '@/content/heroes'
import { ITEMS } from '@/content/items'
import { i18n, type Locale } from '../i18n'
import type { HeroNote, ItemNote, PatchNote, RoleNote } from './notes'

/** What a search result will show. A long patch stops once this is full. */
const SNIPPET_LIMIT = 160

function plain(text: string) {
  return text.replaceAll('**', '').replace(/\s+/g, ' ').trim()
}

function named(name: string, line: string | undefined) {
  return line ? `${name}: ${line}` : undefined
}

function heroLine(entry: HeroNote, locale: Locale) {
  const line = entry.changes[0] ?? entry.abilities?.[0]?.changes[0]
  return named(HEROES[entry.id].name, line && plain(line[locale]))
}

function itemLine(entry: ItemNote, locale: Locale) {
  const line = entry.changes[0]
  return named(ITEMS[entry.id].name, line && plain(line[locale]))
}

function roleLine(entry: RoleNote, locale: Locale) {
  const line = entry.changes[0]
  return named(i18n.global.t(`roles.${entry.id}.name`, {}, { locale }), line && plain(line[locale]))
}

/** Change lines in the order the patch page shows them. */
function changeLines(patch: PatchNote, locale: Locale) {
  const lines: string[] = []

  for (const feature of patch.features ?? []) {
    lines.push(plain(feature.title[locale]), plain(feature.text[locale]))
  }

  for (const line of patch.general ?? []) {
    lines.push(plain(line[locale]))
  }

  for (const entry of patch.items ?? []) {
    const line = itemLine(entry, locale)
    if (line) {
      lines.push(line)
    }
  }

  for (const entry of patch.roles ?? []) {
    const line = roleLine(entry, locale)
    if (line) {
      lines.push(line)
    }
  }

  for (const entry of patch.heroes ?? []) {
    const line = heroLine(entry, locale)
    if (line) {
      lines.push(line)
    }
  }

  for (const line of patch.interface ?? []) {
    lines.push(plain(line[locale]))
  }

  return lines.filter(Boolean)
}

function withFixes(text: string, fixes: string) {
  if (!fixes) {
    return text
  }

  return text ? `${text} · ${fixes}` : fixes
}

function clip(line: string, fixes: string) {
  const room = SNIPPET_LIMIT - (fixes ? fixes.length + 3 : 0)
  if (line.length <= room) {
    return line
  }

  return `${line.slice(0, Math.max(room - 1, 0)).trimEnd()}…`
}

/** A short list of what the patch changes, for the page description. */
export function patchSnippet(patch: PatchNote, locale: Locale) {
  const fixes = patch.fixes?.length ? i18n.global.t('patchNotes.sections.fixes', {}, { locale }) : ''
  let text = ''

  for (const line of changeLines(patch, locale)) {
    const next = text ? `${text} · ${line}` : line
    if (withFixes(next, fixes).length > SNIPPET_LIMIT) {
      if (!text) {
        text = clip(line, fixes)
      }
      break
    }

    text = next
  }

  return withFixes(text, fixes) || plain(patch.title[locale])
}
