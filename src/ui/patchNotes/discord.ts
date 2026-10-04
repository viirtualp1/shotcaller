import { patchPath, SITE_ORIGIN } from '../seo'

import type { Locale } from '../i18n/index'
import type { PatchNote } from './notes'

/** Gold from the patch-note palette, as a Discord embed colour. */
const GOLD = 0xf4c55b

const BRIEF_LINES = 2
const SENTENCE = /^[\s\S]+?[.!?…](?=\s|$)/

export interface DiscordPatchMessage {
  readonly username: string
  readonly allowed_mentions: { readonly parse: readonly [] }
  readonly embeds: readonly [
    {
      readonly title: string
      readonly url: string
      readonly description: string
      readonly color: number
    },
  ]
}

const tidy = (text: string) => text.replace(/\s+/g, ' ').trim()

const sentence = (text: string) => {
  const clean = tidy(text)
  const line = clean.match(SENTENCE)?.[0] ?? clean

  if (line.length <= 240) {
    return line
  }

  return `${line.slice(0, 239).trimEnd()}…`
}

/** The first feature blurbs, then the opening changes, capped so the channel post stays short. */
function briefLines(patch: PatchNote, locale: Locale) {
  const lines: string[] = []

  for (const feature of patch.features ?? []) {
    if (lines.length >= BRIEF_LINES) {
      break
    }

    lines.push(`**${tidy(feature.title[locale]).replaceAll('**', '')}.** ${sentence(feature.text[locale])}`)
  }

  for (const line of patch.general ?? []) {
    if (lines.length >= BRIEF_LINES) {
      break
    }

    lines.push(sentence(line[locale]))
  }

  if (lines.length === 0 && patch.fixes?.length) {
    const first = patch.fixes[0]

    lines.push(locale === 'ru' ? 'Исправления.' : 'Bug fixes.')

    if (first) {
      lines.push(sentence(first[locale]))
    }
  }

  return lines
}

/**
 * A channel post for one release: the patch page, and a short brief in Russian and English.
 * Incoming webhooks post this as the channel's own message.
 */
export function patchDiscordMessage(patch: PatchNote): DiscordPatchMessage {
  const russian = briefLines(patch, 'ru').join('\n\n')

  const english = [`**${tidy(patch.title.en).replaceAll('**', '')}**`, ...briefLines(patch, 'en')].join(
    '\n\n',
  )

  return {
    username: 'The Shotcaller',
    allowed_mentions: { parse: [] },
    embeds: [
      {
        title: `Патч ${patch.version} — ${tidy(patch.title.ru).replaceAll('**', '')}`,
        url: `${SITE_ORIGIN}${patchPath(patch.version)}/`,
        description: [russian, english].filter((part) => part.length > 0).join('\n\n'),
        color: GOLD,
      },
    ],
  }
}

/** The newest `version:` written in the patch-notes source. Notes are listed newest first. */
export function latestNotedVersion(source: string) {
  return source.match(/^\s*version:\s*'([^']+)'/m)?.[1] ?? null
}

const WEBHOOK_URL = /^https:\/\/(?:(?:canary|ptb)\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[\w.-]+$/

export const isDiscordWebhook = (url: string) => WEBHOOK_URL.test(url)

/** Posts one patch. The webhook URL is a secret and is never included in the error. */
export async function postDiscordWebhook(url: string, message: DiscordPatchMessage) {
  if (!isDiscordWebhook(url)) {
    throw new Error('DISCORD_PATCH_WEBHOOK must be a Discord incoming webhook URL.')
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(message),
    signal: AbortSignal.timeout(15_000),
  })

  if (!response.ok) {
    throw new Error(`Discord rejected the patch post (${response.status}).`)
  }
}
