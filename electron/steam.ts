import steamworks from 'steamworks.js'
import { achievementNames } from './achievementNames.js'

/** Spacewar, Valve's public test app. Replace it with The Shotcaller's own app ID once Steamworks issues one. */
export const STEAM_APP_ID = 480

/** Names the web service a sign-in ticket is for; the steam-auth Edge Function checks the same name. */
export const STEAM_TICKET_IDENTITY = 'theshotcaller'

type SteamClient = ReturnType<typeof steamworks.init>

export interface Steam {
  /** Unlocks the named achievements the player does not have yet and returns those. */
  unlock(input: unknown): string[]
  /** A one-time ticket proving who the player is, hex-encoded for the steam-auth Edge Function. */
  ticket(): Promise<string>
}

/**
 * Connects to the Steam client before the app is ready, so the overlay can hook the window. Without a running Steam
 * client, or for a player who does not own the game, the game plays on without Steam.
 */
export function startSteam(): Steam | null {
  let client: SteamClient

  try {
    client = steamworks.init(STEAM_APP_ID)
  } catch (error) {
    console.warn('Steam is not available', error)

    return null
  }

  steamworks.electronEnableSteamOverlay()

  return {
    unlock(input) {
      const unlocked: string[] = []

      for (const name of achievementNames(input)) {
        if (!client.achievement.isActivated(name) && client.achievement.activate(name)) {
          unlocked.push(name)
        }
      }

      return unlocked
    },

    async ticket() {
      const ticket = await client.auth.getAuthTicketForWebApi(STEAM_TICKET_IDENTITY)

      return ticket.getBytes().toString('hex')
    },
  }
}
