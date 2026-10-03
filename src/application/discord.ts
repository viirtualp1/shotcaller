/** The URL mapping in the Discord Developer Portal that forwards `/.proxy/supabase` to the Supabase project. */
export const DISCORD_SUPABASE_PREFIX = '/.proxy/supabase'

/** Discord opens an Activity with these launch parameters; a regular visit never has them. */
export function isDiscordActivity(search = typeof location === 'undefined' ? '' : location.search) {
  const params = new URLSearchParams(search)

  return params.has('frame_id') && params.has('instance_id')
}

/** Read once at startup: navigation inside the game may drop the launch parameters later. */
export const IN_DISCORD = isDiscordActivity()

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
export async function startDiscordActivity(clientId: string | undefined) {
  if (!clientId) {
    console.error('Discord Activity: VITE_DISCORD_CLIENT_ID is not set.')

    return null
  }

  const { DiscordSDK } = await import('@discord/embedded-app-sdk')
  const sdk = new DiscordSDK(clientId)
  await sdk.ready()

  return sdk
}
