import { z } from 'zod'

/** The ticket identity the desktop app asks Steam for (`electron/steam.ts`). */
export const STEAM_TICKET_IDENTITY = 'theshotcaller'

/** Accounts made by Steam sign-in get an address here; nothing is sent to it. `src/application/steam.ts` matches. */
export const steamEmail = (steamId: string) => `steam-${steamId}@steam.theshotcaller.online`

const requestSchema = z.strictObject({
  ticket: z.string().regex(/^[0-9a-f]{16,4096}$/i),
})

const STEAM_ID = /^\d{17}$/

/** Steam's answer to AuthenticateUserTicket; only a valid ticket for an unbanned player yields an ID. */
export function steamIdFromTicketResponse(response: unknown) {
  const parsed = z
    .object({
      response: z.object({
        params: z.object({
          result: z.literal('OK'),
          steamid: z.string().regex(STEAM_ID),
          vacbanned: z.boolean().optional(),
          publisherbanned: z.boolean().optional(),
        }),
      }),
    })
    .safeParse(response)

  if (!parsed.success) {
    return null
  }

  const { steamid, vacbanned, publisherbanned } = parsed.data.response.params

  return vacbanned || publisherbanned ? null : steamid
}

export interface Caller {
  readonly id: string
  readonly anonymous: boolean
}

export interface SteamAuthStore {
  /** The Steam ID behind a ticket, or null when Steam does not accept it. */
  verifyTicket(ticket: string): Promise<string | null>
  /** The signed-in account that sent the request, if any. */
  caller(): Promise<Caller | null>
  linkedAccount(steamId: string): Promise<string | null>
  /** False when the Steam account was linked elsewhere in the meantime. */
  link(steamId: string, userId: string): Promise<boolean>
  createAccount(steamId: string): Promise<string>
  /** A one-time token the game exchanges for a session of that account. */
  signInToken(userId: string): Promise<string>
}

export type SteamAuthResult =
  | { readonly status: 200; readonly body: { readonly result: 'current' | 'linked' | 'linkedElsewhere' } }
  | { readonly status: 200; readonly body: { readonly result: 'signIn'; readonly tokenHash: string } }
  | { readonly status: 400 | 401 | 409; readonly body: { readonly error: string } }

/**
 * Steam sign-in for the desktop game.
 * - A Steam account that is already linked signs in to its account, unless an email account is signed in.
 * - An unlinked Steam account joins the signed-in email account.
 * - Otherwise it gets a new account, and the game moves this device's progress into it, as Google sign-in does.
 */
export async function handleSteamAuth(body: unknown, store: SteamAuthStore): Promise<SteamAuthResult> {
  const input = requestSchema.safeParse(body)

  if (!input.success) {
    return {
      status: 400,
      body: { error: 'request' },
    }
  }

  const steamId = await store.verifyTicket(input.data.ticket)

  if (!steamId) {
    return {
      status: 401,
      body: { error: 'ticket' },
    }
  }

  const caller = await store.caller()
  const permanent = caller && !caller.anonymous ? caller : null
  const linked = await store.linkedAccount(steamId)

  if (linked) {
    if (linked === caller?.id) {
      return {
        status: 200,
        body: { result: 'current' },
      }
    }

    if (permanent) {
      return {
        status: 200,
        body: { result: 'linkedElsewhere' },
      }
    }

    return {
      status: 200,
      body: {
        result: 'signIn',
        tokenHash: await store.signInToken(linked),
      },
    }
  }

  if (permanent) {
    return (await store.link(steamId, permanent.id))
      ? {
          status: 200,
          body: { result: 'linked' },
        }
      : {
          status: 409,
          body: { error: 'linked' },
        }
  }

  const created = await store.createAccount(steamId)

  if (!(await store.link(steamId, created))) {
    return {
      status: 409,
      body: { error: 'linked' },
    }
  }

  return {
    status: 200,
    body: {
      result: 'signIn',
      tokenHash: await store.signInToken(created),
    },
  }
}
