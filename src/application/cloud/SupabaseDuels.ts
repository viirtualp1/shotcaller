import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import type { TeamId } from '@/content/ids'
import { DuelError, type Duel, type DuelFailure, type DuelService } from '../social/duels'
import type { Database } from './database'
import { asJson } from './json'

/** Error codes raised by the duel functions in `supabase/migrations`. */
const FAILURES: Readonly<Record<string, DuelFailure>> = {
  P0409: 'busy',
  P0410: 'gone',
  P0429: 'rateLimited',
  P0425: 'tooEarly',
  '42501': 'forbidden',
}

const failure = (error: { code?: string } | null, overrides: Readonly<Record<string, DuelFailure>> = {}) =>
  new DuelError(overrides[error?.code ?? ''] ?? FAILURES[error?.code ?? ''] ?? 'failed')

/** Rows from functions and Realtime are checked before the game trusts them. */
const duelRow = z.object({
  id: z.uuid(),
  host: z.uuid(),
  guest: z.uuid(),
  status: z.enum(['invited', 'declined', 'cancelled', 'expired', 'active', 'finished', 'disputed']),
  seed: z.string().max(64).nullable(),
  round: z.number().int().min(1).max(40),
  round_opened_at: z.string().nullable(),
  host_board_round: z.number().int(),
  guest_board_round: z.number().int(),
  winner: z.uuid().nullable().optional(),
  ended_by: z.enum(['result', 'forfeit', 'timeout']).nullable().optional(),
  created_at: z.string(),
})

const boardRow = z.object({
  duel_id: z.uuid(),
  round: z.number().int().min(1).max(40),
  side: z.union([z.literal(0), z.literal(1)]),
  board: z.unknown(),
})

function toDuel(row: z.infer<typeof duelRow>): Duel {
  return {
    id: row.id,
    host: row.host,
    guest: row.guest,
    status: row.status,
    seed: row.seed,
    round: row.round,
    roundOpenedAt: row.round_opened_at,
    boardRounds: [row.host_board_round, row.guest_board_round],
    winner: row.winner ?? null,
    endedBy: row.ended_by ?? null,
    createdAt: row.created_at,
  }
}

export class SupabaseDuels implements DuelService {
  constructor(
    private readonly client: SupabaseClient<Database>,
    private readonly userId: string,
  ) {}

  async invite(friendId: string) {
    const { data, error } = await this.client.rpc('invite_duel', { friend: friendId })
    if (error) {
      throw failure(error)
    }

    return data
  }

  async respond(duelId: string, accept: boolean) {
    const { error } = await this.client.rpc('respond_duel', {
      duel: duelId,
      accept,
    })

    if (error) {
      throw failure(error)
    }
  }

  async cancel(duelId: string) {
    const { error } = await this.client.rpc('cancel_duel', { duel: duelId })
    if (error) {
      throw failure(error)
    }
  }

  async mine() {
    const { data, error } = await this.client.rpc('my_duels')
    if (error) {
      throw failure(error)
    }

    return data.flatMap((row) => {
      const duel = duelRow.safeParse(row)

      return duel.success
        ? [
            {
              duel: toDuel(duel.data),
              opponent: {
                id: duel.data.host === this.userId ? duel.data.guest : duel.data.host,
                name: row.opponent_name,
                avatar: row.opponent_avatar,
                rating: row.opponent_rating,
              },
            },
          ]
        : []
    })
  }

  async submitBoard(duelId: string, round: number, board: unknown) {
    const { data, error } = await this.client.rpc('submit_board', {
      duel: duelId,
      board_round: round,
      payload: asJson(board),
    })

    if (error) {
      throw failure(error, { P0409: 'wrongRound' })
    }

    return data
  }

  async opponentBoard(duelId: string, round: number) {
    const { data, error } = await this.client.rpc('duel_board', {
      duel: duelId,
      board_round: round,
    })

    if (error) {
      throw failure(error)
    }

    return data
  }

  async report(duelId: string, winningSide: TeamId | null) {
    const { error } = await this.client.rpc('report_duel', {
      duel: duelId,
      winning_side: winningSide,
    })

    if (error) {
      throw failure(error)
    }
  }

  async forfeit(duelId: string) {
    const { error } = await this.client.rpc('forfeit_duel', { duel: duelId })
    if (error) {
      throw failure(error)
    }
  }

  async claim(duelId: string) {
    const { error } = await this.client.rpc('claim_duel', { duel: duelId })
    if (error) {
      throw failure(error)
    }
  }

  watch(onChange: (duel: Duel) => void) {
    const channel = this.client.channel(`duels:${this.userId}`)

    for (const column of ['host', 'guest']) {
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'duels',
          filter: `${column}=eq.${this.userId}`,
        },
        (payload) => {
          const row = duelRow.safeParse(payload.new)
          if (row.success) {
            onChange(toDuel(row.data))
          }
        },
      )
    }

    channel.subscribe()

    return () => void this.client.removeChannel(channel)
  }

  watchBoards(duelId: string, onBoard: (round: number, side: TeamId, board: unknown) => void) {
    const channel = this.client.channel(`duel-boards:${duelId}`)

    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'duel_boards',
        filter: `duel_id=eq.${duelId}`,
      },
      (payload) => {
        const row = boardRow.safeParse(payload.new)
        if (row.success && row.data.duel_id === duelId) {
          onBoard(row.data.round, row.data.side, row.data.board)
        }
      },
    )

    channel.subscribe()

    return () => void this.client.removeChannel(channel)
  }
}
