import { describe, expect, it } from 'vitest'
import {
  handleSteamAuth,
  steamEmail,
  steamIdFromTicketResponse,
  type Caller,
  type SteamAuthStore,
} from '../../supabase/functions/_shared/steamAuth'
import { isSteamEmail } from '@/application/steam'

const STEAM_ID = '76561198000000001'
const TICKET = { ticket: 'ab'.repeat(20) }

function store(options: { caller?: Caller | null; linked?: string | null; linkFails?: boolean } = {}) {
  const calls: string[] = []

  const fake: SteamAuthStore = {
    verifyTicket: async (ticket) => (ticket === TICKET.ticket ? STEAM_ID : null),
    caller: async () => options.caller ?? null,
    linkedAccount: async () => options.linked ?? null,
    link: async (steamId, userId) => {
      calls.push(`link ${steamId} ${userId}`)

      return !options.linkFails
    },
    createAccount: async (steamId) => {
      calls.push(`create ${steamId}`)

      return 'new-user'
    },
    signInToken: async (userId) => `token-for-${userId}`,
  }

  return {
    fake,
    calls,
  }
}

describe('Steam sign-in', () => {
  it('accepts only a valid ticket for an unbanned player', () => {
    const answer = (params: object) => ({ response: { params } })

    expect(
      steamIdFromTicketResponse(
        answer({
          result: 'OK',
          steamid: STEAM_ID,
        }),
      ),
    ).toBe(STEAM_ID)

    expect(
      steamIdFromTicketResponse(
        answer({
          result: 'OK',
          steamid: STEAM_ID,
          vacbanned: true,
        }),
      ),
    ).toBeNull()

    expect(steamIdFromTicketResponse({ response: { error: { errorcode: 101 } } })).toBeNull()
  })

  it('refuses malformed requests and tickets Steam rejects', async () => {
    expect((await handleSteamAuth({ ticket: 'not hex' }, store().fake)).status).toBe(400)
    expect((await handleSteamAuth({ ticket: 'cd'.repeat(20) }, store().fake)).status).toBe(401)
  })

  it('gives a new Steam player an account and signs the game in to it', async () => {
    const { fake, calls } = store({
      caller: {
        id: 'guest',
        anonymous: true,
      },
    })

    expect(await handleSteamAuth(TICKET, fake)).toEqual({
      status: 200,
      body: {
        result: 'signIn',
        tokenHash: 'token-for-new-user',
      },
    })

    expect(calls).toEqual([`create ${STEAM_ID}`, `link ${STEAM_ID} new-user`])
  })

  it('signs a returning Steam player in to their account', async () => {
    const { fake, calls } = store({ linked: 'steam-user' })

    expect((await handleSteamAuth(TICKET, fake)).body).toEqual({
      result: 'signIn',
      tokenHash: 'token-for-steam-user',
    })

    expect(calls).toEqual([])
  })

  it('links Steam to the email account already signed in', async () => {
    const { fake, calls } = store({
      caller: {
        id: 'email-user',
        anonymous: false,
      },
    })

    expect((await handleSteamAuth(TICKET, fake)).body).toEqual({ result: 'linked' })
    expect(calls).toEqual([`link ${STEAM_ID} email-user`])
  })

  it('never moves a signed-in email account to another account', async () => {
    const { fake } = store({
      caller: {
        id: 'email-user',
        anonymous: false,
      },
      linked: 'steam-user',
    })

    expect((await handleSteamAuth(TICKET, fake)).body).toEqual({ result: 'linkedElsewhere' })
  })

  it('leaves the account as it is when Steam already belongs to it', async () => {
    const { fake } = store({
      caller: {
        id: 'steam-user',
        anonymous: false,
      },
      linked: 'steam-user',
    })

    expect((await handleSteamAuth(TICKET, fake)).body).toEqual({ result: 'current' })
  })

  it('gives Steam accounts an address the game recognises', () => {
    expect(isSteamEmail(steamEmail(STEAM_ID))).toBe(true)
    expect(isSteamEmail('coach@example.com')).toBe(false)
    expect(isSteamEmail(null)).toBe(false)
  })
})
