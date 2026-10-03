import { describe, expect, it } from 'vitest'
import { discordInstallUrl, isDiscordActivity } from '@/application/discord'

describe('Discord Activity', () => {
  it('recognises the launch parameters Discord adds', () => {
    expect(isDiscordActivity('?instance_id=i-1&frame_id=f-1&platform=desktop')).toBe(true)
  })

  it('treats a regular visit as the website', () => {
    expect(isDiscordActivity('')).toBe(false)
    expect(isDiscordActivity('?frame_id=f-1')).toBe(false)
  })

  it('offers the install link only once the Activity is public', () => {
    expect(discordInstallUrl({ VITE_DISCORD_CLIENT_ID: '1234567890' })).toBeNull()

    expect(
      discordInstallUrl({
        VITE_DISCORD_CLIENT_ID: 'not-an-id',
        VITE_DISCORD_PUBLIC: 'true',
      }),
    ).toBeNull()

    expect(
      discordInstallUrl({
        VITE_DISCORD_CLIENT_ID: ' 1234567890 ',
        VITE_DISCORD_PUBLIC: 'true',
      }),
    ).toBe('https://discord.com/oauth2/authorize?client_id=1234567890')
  })
})
