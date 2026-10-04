import { patchPath, SITE_ORIGIN } from '../seo'

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
function briefLines(patch: PatchNote) {
  const lines: string[] = []

  for (const feature of patch.features ?? []) {
    if (lines.length >= BRIEF_LINES) {
      break
    }

    lines.push(`**${tidy(feature.title.en).replaceAll('**', '')}.** ${sentence(feature.text.en)}`)
  }

  for (const line of patch.general ?? []) {
    if (lines.length >= BRIEF_LINES) {
      break
    }

    lines.push(sentence(line.en))
  }

  if (lines.length === 0 && patch.fixes?.length) {
    const first = patch.fixes[0]

    lines.push('Bug fixes.')

    if (first) {
      lines.push(sentence(first.en))
    }
  }

  return lines
}

/**
 * A channel post for one release: the patch page, and a short English brief.
 * Incoming webhooks post this as the channel's own message.
 */
export function patchDiscordMessage(patch: PatchNote): DiscordPatchMessage {
  const description = [`**${tidy(patch.title.en).replaceAll('**', '')}**`, ...briefLines(patch)].join('\n\n')

  return {
    username: 'The Shotcaller',
    allowed_mentions: { parse: [] },
    embeds: [
      {
        title: `Patch ${patch.version} — ${tidy(patch.title.en).replaceAll('**', '')}`,
        url: `${SITE_ORIGIN}${patchPath(patch.version)}/`,
        description,
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
