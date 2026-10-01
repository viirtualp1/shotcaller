import { createClient } from '@supabase/supabase-js'
import { telemetryRequestSchema } from '../_shared/telemetry.ts'
import { handleTelemetry } from '../_shared/handleTelemetry.ts'

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers })
  }

  if (request.method !== 'POST') {
    return new Response(null, {
      status: 405,
      headers,
    })
  }

  try {
    const host = Deno.env.get('POSTHOG_HOST')
    const key = Deno.env.get('POSTHOG_PROJECT_KEY')
    // Restrict the recipient to the disclosed US PostHog region.
    if (host !== 'https://us.i.posthog.com' || !key) {
      return new Response('{}', {
        status: 503,
        headers,
      })
    }

    const authorization = request.headers.get('Authorization')
    if (!authorization) {
      return new Response('{}', {
        status: 401,
        headers,
      })
    }

    // Publishable-key projects verify JWTs here, independently of the gateway configuration.
    const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authorization } },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    const { data, error } = await client.auth.getUser(authorization.replace(/^Bearer /i, ''))
    if (error || !data.user || data.user.is_anonymous) {
      return new Response('{}', {
        status: 401,
        headers,
      })
    }

    const body = await request.text()
    if (body.length > 65_536) {
      return new Response('{}', {
        status: 413,
        headers,
      })
    }

    const parsed = telemetryRequestSchema.safeParse(JSON.parse(body))
    if (!parsed.success) {
      return new Response('{}', {
        status: 400,
        headers,
      })
    }

    const status = await handleTelemetry(parsed.data, {
      reserve: async (input) => {
        const { data, error } = await client.rpc('reserve_telemetry', {
          policy_version: input.policyVersion,
          match_id: input.matchId,
          finished_at: input.finishedAt,
        })

        if (error) {
          throw error
        }

        return data
      },
      send: (event) =>
        fetch(`${host}/i/v0/e/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            api_key: key,
            ...event,
          }),
          signal: AbortSignal.timeout(5000),
        }),
    })

    return new Response('{}', {
      status,
      headers,
    })
  } catch {
    // Never log request bodies, authentication headers, or gameplay payloads.
    return new Response('{}', {
      status: 503,
      headers,
    })
  }
})
