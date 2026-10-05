import { IN_DESKTOP } from './desktop'

/** What the desktop app's preload offers the game (`electron/preload.cts`). */
export interface SteamBridge {
  available(): Promise<boolean>
  /** Unlocks the named achievements the player does not have yet and returns those. */
  unlock(names: readonly string[]): Promise<string[]>
  /** A one-time ticket proving who the player is, for the steam-auth Edge Function. */
  ticket(): Promise<string | null>
}

declare global {
  interface Window {
    shotcallerSteam?: SteamBridge
  }
}

/**
 * Accounts made by Steam sign-in get an address at this domain; nothing is ever sent there.
 * The steam-auth Edge Function (`supabase/functions/_shared/steamAuth.ts`) uses the same one.
 */
const STEAM_EMAIL_DOMAIN = '@steam.theshotcaller.online'

export const isSteamEmail = (email: string | null | undefined) => email?.endsWith(STEAM_EMAIL_DOMAIN) ?? false

/** Steam, when the desktop app runs under a Steam client; null on the web, in Discord and without Steam. */
export async function connectSteam() {
  const bridge = IN_DESKTOP ? globalThis.window?.shotcallerSteam : undefined

  if (!bridge) {
    return null
  }

  try {
    return (await bridge.available()) ? bridge : null
  } catch {
    return null
  }
}
