import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'
import { isDiscordWebhook, latestNotedVersion, patchDiscordMessage } from '@/ui/patchNotes/discord'
import { LATEST_PATCH, type PatchNote } from '@/ui/patchNotes/notes'

const fix: PatchNote = {
  version: '9.1.1',
  date: '2026-10-05',
  title: {
    en: 'A quiet fix',
    ru: 'Тихий фикс',
  },
  fixes: [
    {
      en: 'The **score** settles when the round ends.',
      ru: '**Счёт** оседает, когда раунд кончается.',
    },
  ],
}

describe('discord patch posts', () => {
  it('reads the newest version from the notes source', () => {
    const source = "export const notes = [\n  {\n    version: '9.1',\n    version: '8.0',\n"

    expect(latestNotedVersion(source)).toBe('9.1')
    expect(latestNotedVersion(readFileSync('src/ui/patchNotes/notes.ts', 'utf8'))).toBe(LATEST_PATCH.version)
    expect(latestNotedVersion('nothing here')).toBeNull()
  })

  it('links the patch page and keeps the brief short in both languages', () => {
    const message = patchDiscordMessage(LATEST_PATCH)
    const embed = message.embeds[0]

    expect(embed.title).toBe(`Патч ${LATEST_PATCH.version} — ${LATEST_PATCH.title.ru.replaceAll('**', '')}`)
    expect(embed.url).toBe(`https://theshotcaller.online/patches/${LATEST_PATCH.version}/`)
    expect(embed.description).toContain(LATEST_PATCH.title.en.replaceAll('**', ''))
    expect(embed.description.length).toBeLessThan(1200)
    expect(message.allowed_mentions.parse).toEqual([])
    expect(message.username).toBe('The Shotcaller')
  })

  it('still says what a fix release changed', () => {
    const message = patchDiscordMessage(fix)

    expect(message.embeds[0].title).toContain('9.1.1')
    expect(message.embeds[0].description).toContain('Исправления.')
    expect(message.embeds[0].description).toContain('**Счёт**')
    expect(message.embeds[0].description).toContain('Bug fixes.')
    expect(message.embeds[0].url).toBe('https://theshotcaller.online/patches/9.1.1/')
  })

  it('accepts only Discord incoming webhook URLs', () => {
    expect(isDiscordWebhook('https://discord.com/api/webhooks/123/abc_DEF-9')).toBe(true)
    expect(isDiscordWebhook('https://discordapp.com/api/webhooks/123/token')).toBe(true)
    expect(isDiscordWebhook('https://example.com/api/webhooks/123/token')).toBe(false)
    expect(isDiscordWebhook('http://discord.com/api/webhooks/123/token')).toBe(false)
  })
})
