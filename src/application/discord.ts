import type { DiscordSDK } from '@discord/embedded-app-sdk'

/** The URL mapping in the Discord Developer Portal that forwards `/.proxy/supabase` to the Supabase project. */
export const DISCORD_SUPABASE_PREFIX = '/.proxy/supabase'

/** Discord opens an Activity with these launch parameters; a regular visit never has them. */
export function isDiscordActivity(search = typeof location === 'undefined' ? '' : location.search) {
  const params = new URLSearchParams(search)

  return params.has('frame_id') && params.has('instance_id')
}

/** Read once at startup: navigation inside the game may drop the launch parameters later. */
export const IN_DISCORD = isDiscordActivity()

/** The running Activity once its handshake is done; null outside Discord or when it failed. */
let activity: Promise<DiscordSDK | null> = Promise.resolve(null)

/**
 * Inside Discord the page may only reach its own origin, so Supabase goes through the Activity's URL mapping.
 * Google sign-in leaves the page and cannot return to the Activity frame; the email code still works.
 */
export function discordCloudUrl(origin: string) {
  return `${origin}${DISCORD_SUPABASE_PREFIX}`
}

export interface DiscordEnv {
  readonly VITE_DISCORD_CLIENT_ID?: string
  readonly VITE_DISCORD_PUBLIC?: string
}

/** The Discord-provided install link, offered only once the Activity is announced as public. */
export function discordInstallUrl(env: DiscordEnv) {
  const id = env.VITE_DISCORD_CLIENT_ID?.trim()
  if (!id || !/^\d+$/.test(id) || env.VITE_DISCORD_PUBLIC !== 'true') {
    return null
  }

  return `https://discord.com/oauth2/authorize?client_id=${id}`
}

/** Completes the handshake that tells Discord the Activity has loaded. */
export function startDiscordActivity(clientId: string | undefined) {
  if (!clientId) {
    console.error('Discord Activity: VITE_DISCORD_CLIENT_ID is not set.')

    return activity
  }

  activity = import('@discord/embedded-app-sdk').then(async ({ DiscordSDK }) => {
    const sdk = new DiscordSDK(clientId)
    await sdk.ready()

    return sdk
  })

  return activity
}

/**
 * Invites friends into this Activity. On a server Discord's own invite dialog opens; in a direct message, or for a
 * player not allowed to create invites there, the Activity link is shared instead. Resolves to false when nothing
 * could be opened; a dialog the player simply closes still counts as opened.
 */
export async function inviteToActivity(message: string) {
  const sdk = await activity.catch(() => null)
  if (!sdk) {
    return false
  }

  if (sdk.guildId) {
    try {
      await sdk.commands.openInviteDialog()

      return true
    } catch {
      /* No invite permission on this server: share the link instead. */
    }
  }

  try {
    await sdk.commands.shareLink({ message })

    return true
  } catch {
    return false
  }
}
