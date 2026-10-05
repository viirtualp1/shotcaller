import { createClient } from '@supabase/supabase-js'
import {
  handleSteamAuth,
  STEAM_TICKET_IDENTITY,
  steamEmail,
  steamIdFromTicketResponse,
} from '../_shared/steamAuth.ts'

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

const reply = (status: number, body: object) =>
  new Response(JSON.stringify(body), {
    status,
    headers,
  })

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers })
  }

  if (request.method !== 'POST') {
    return reply(405, {})
  }

  try {
    const key = Deno.env.get('STEAM_WEB_API_KEY')
    const appId = Deno.env.get('STEAM_APP_ID')

    if (!key || !appId) {
      return reply(503, {})
    }

    const body = await request.text()

    if (body.length > 16_384) {
      return reply(413, {})
    }

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    const result = await handleSteamAuth(JSON.parse(body), {
      async verifyTicket(ticket) {
        const url = new URL('https://partner.steam-api.com/ISteamUserAuth/AuthenticateUserTicket/v1/')
        url.searchParams.set('key', key)
        url.searchParams.set('appid', appId)
        url.searchParams.set('ticket', ticket)
        url.searchParams.set('identity', STEAM_TICKET_IDENTITY)

        const response = await fetch(url, { signal: AbortSignal.timeout(5000) })

        return response.ok ? steamIdFromTicketResponse(await response.json()) : null
      },

      async caller() {
        // Without a session the game sends its publishable key, which is not a user token.
        const token = request.headers.get('Authorization')?.replace(/^Bearer /i, '')

        if (!token) {
          return null
        }

        const { data } = await admin.auth.getUser(token)

        return data.user
          ? {
              id: data.user.id,
              anonymous: data.user.is_anonymous ?? false,
            }
          : null
      },

      async linkedAccount(steamId) {
        const { data, error } = await admin
          .from('steam_accounts')
          .select('user_id')
          .eq('steam_id', steamId)
          .maybeSingle()

        if (error) {
          throw error
        }

        return data?.user_id ?? null
      },

      async link(steamId, userId) {
        const { error } = await admin.from('steam_accounts').insert({
          steam_id: steamId,
          user_id: userId,
        })

        // A unique violation: this Steam account or this account was linked in the meantime.
        if (error?.code === '23505') {
          return false
        }

        if (error) {
          throw error
        }

        return true
      },

      async createAccount(steamId) {
        const { data, error } = await admin.auth.admin.createUser({
          email: steamEmail(steamId),
          email_confirm: true,
          app_metadata: { steam_id: steamId },
        })

        if (error || !data.user) {
          throw error ?? new Error('No user created')
        }

        return data.user.id
      },

      async signInToken(userId) {
        const { data: found, error: lookup } = await admin.auth.admin.getUserById(userId)

        if (lookup || !found.user?.email) {
          throw lookup ?? new Error('The account has no email')
        }

        const { data, error } = await admin.auth.admin.generateLink({
          type: 'magiclink',
          email: found.user.email,
        })

        if (error) {
          throw error
        }

        return data.properties.hashed_token
      },
    })

    return reply(result.status, result.body)
  } catch {
    // Never log tickets or tokens.
    return reply(503, {})
  }
})
