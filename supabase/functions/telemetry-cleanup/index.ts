import { createClient } from '@supabase/supabase-js'
import { deleteTelemetry } from '../_shared/deleteTelemetry.ts'

Deno.serve(async (request: Request) => {
  const token = Deno.env.get('TELEMETRY_CLEANUP_TOKEN')
  if (!token || request.headers.get('Authorization') !== `Bearer ${token}`) {
    return new Response(null, { status: 401 })
  }

  if (request.method !== 'POST') {
    return new Response(null, { status: 405 })
  }

  const key = Deno.env.get('POSTHOG_PERSONAL_API_KEY')
  const project = Deno.env.get('POSTHOG_PROJECT_ID')
  if (!key || !project || !/^\d+$/.test(project)) {
    return new Response(null, { status: 503 })
  }

  try {
    const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    const { data, error } = await client
      .from('telemetry_deletions')
      .select('analytics_id')
      .lte('ready_at', new Date().toISOString())
      .order('ready_at')
      .limit(10)

    if (error) {
      throw error
    }

    const accepted = await deleteTelemetry(data ?? [], {
      remove: (id) =>
        fetch(`https://us.posthog.com/api/projects/${project}/persons/bulk_delete/`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            distinct_ids: [id],
            delete_events: true,
            delete_recordings: true,
          }),
          signal: AbortSignal.timeout(10_000),
        }),
      acknowledge: async (id) => {
        const { error } = await client.from('telemetry_deletions').delete().eq('analytics_id', id)
        if (error) {
          throw error
        }
      },
    })

    // Move unsuccessful jobs behind the next batch, so an absent person cannot starve the queue.
    if (data?.length) {
      const { error } = await client
        .from('telemetry_deletions')
        .update({ ready_at: new Date(Date.now() + 15 * 60_000).toISOString() })
        .in(
          'analytics_id',
          data.map((job) => job.analytics_id),
        )

      if (error) {
        throw error
      }
    }

    // No payload is stored here. Receipts only prevent duplicate event submission and throttle abuse.
    const { error: pruneError } = await client
      .from('telemetry_receipts')
      .delete()
      .lt('created_at', new Date(Date.now() - 30 * 86_400_000).toISOString())

    if (pruneError) {
      throw pruneError
    }

    return Response.json({ accepted })
  } catch {
    return new Response(null, { status: 503 })
  }
})
