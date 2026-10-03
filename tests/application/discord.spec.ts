import { beforeEach, describe, expect, it, vi } from 'vitest'
import { discordInstallUrl, isDiscordActivity } from '@/application/discord'

const sdk = {
  guildId: null as string | null,
  ready: vi.fn(async () => undefined),
  commands: {
    openInviteDialog: vi.fn(async () => null),
    shareLink: vi.fn(async () => ({
      success: true,
      didCopyLink: false,
      didSendMessage: true,
    })),
  },
}

vi.mock('@discord/embedded-app-sdk', () => ({
  DiscordSDK: function DiscordSDK() {
    return sdk
  },
}))

/** A fresh module per test: the running Activity is kept at module level. */
async function startedActivity(guildId: string | null) {
  vi.resetModules()
  sdk.guildId = guildId
  const discord = await import('@/application/discord')
  await discord.startDiscordActivity('123')

  return discord
}

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

  describe('inviting friends', () => {
    beforeEach(() => {
      sdk.commands.openInviteDialog.mockReset().mockResolvedValue(null)
      sdk.commands.shareLink.mockClear()
    })

    it("opens Discord's invite dialog on a server", async () => {
      const discord = await startedActivity('guild')

      expect(await discord.inviteToActivity('Join me')).toBe(true)
      expect(sdk.commands.openInviteDialog).toHaveBeenCalledOnce()
      expect(sdk.commands.shareLink).not.toHaveBeenCalled()
    })

    it('shares the Activity link in a direct message or without invite permission', async () => {
      const inDirectMessage = await startedActivity(null)
      expect(await inDirectMessage.inviteToActivity('Join me')).toBe(true)
      expect(sdk.commands.openInviteDialog).not.toHaveBeenCalled()

      sdk.commands.openInviteDialog.mockRejectedValue(new Error('INVALID_PERMISSIONS'))
      const withoutPermission = await startedActivity('guild')
      expect(await withoutPermission.inviteToActivity('Join me')).toBe(true)
      expect(sdk.commands.shareLink).toHaveBeenCalledTimes(2)
      expect(sdk.commands.shareLink).toHaveBeenCalledWith({ message: 'Join me' })
    })

    it('does nothing outside Discord', async () => {
      vi.resetModules()
      const discord = await import('@/application/discord')

      expect(await discord.inviteToActivity('Join me')).toBe(false)
    })
  })
})
