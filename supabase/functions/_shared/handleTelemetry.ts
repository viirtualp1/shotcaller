import { telemetryRequestSchema } from './telemetry.ts'

interface Reservation {
  analyticsId: string
  eventId: string
}

interface Transport {
  reserve(input: ReturnType<typeof telemetryRequestSchema.parse>): Promise<Reservation | null>
  send(event: Record<string, unknown>): Promise<{ ok: boolean }>
}

/** Testable ingestion boundary. Rebuild the payload before it can reach a third party. */
export async function handleTelemetry(body: unknown, transport: Transport) {
  const input = telemetryRequestSchema.safeParse(body)
  if (!input.success) {
    return 400
  }

  const reserved = await transport.reserve(input.data)
  if (!reserved) {
    return 204
  }

  const payload = input.data.payload

  const response = await transport.send({
    event: 'game_match_finished',
    uuid: reserved.eventId,
    timestamp: input.data.finishedAt,
    properties: {
      ...payload,
      distinct_id: reserved.analyticsId,
      $geoip_disable: true,
      $ip: null,
      // A random, private pseudonym allows per-player analysis and deletion, without identity properties.
      $process_person_profile: true,
      consent_version: input.data.policyVersion,
      data_source: 'client_reported',
      unit: 'player_match',
      hero_ids: [...new Set(payload.heroes.map((h) => h.heroId))],
      item_ids: [
        ...new Set(
          payload.roundBoards
            .flatMap((r) => r.lineup.flatMap((h) => h.items))
            .concat(payload.lineup.flatMap((h) => h.items)),
        ),
      ],
      synergy_ids: [...new Set(payload.roundBoards.flatMap((r) => r.synergies).concat(payload.synergies))],
    },
  })

  return response.ok ? 202 : 502
}
