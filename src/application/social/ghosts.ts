import type { ModeId } from '@/content/ids'
import type { PlayerState } from '@/domain/player/Player'
import { parseRemoteBoard } from '../persistence/snapshot'

export const GHOST_WAIT_SECONDS = 45
export const GHOST_COACH_ID = '00000000-0000-4000-8000-000000000000'

/** Recorded hero ids belong to another match. Give them a deterministic namespace on both client and arbiter. */
export function parseGhostBoard(raw: unknown, mode: ModeId): PlayerState | null {
  const board = parseRemoteBoard(raw, mode)
  if (!board) {
    return null
  }

  let index = 0

  const hero = (value: PlayerState['roster']['bench'][number]) => ({
    ...value,
    uid: 'ghost:' + index++,
  })

  return {
    ...board,
    roster: {
      ...board.roster,
      bench: board.roster.bench.map(hero),
      lanes: {
        top: board.roster.lanes.top.map(hero),
        mid: board.roster.lanes.mid.map(hero),
        bot: board.roster.lanes.bot.map(hero),
      },
    },
  }
}
