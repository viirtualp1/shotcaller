import type { ModeId } from '@/content/ids'
import { arbitrateDuel, winningSide } from './arbiter'

export interface GhostRecord {
  readonly mode: ModeId
  readonly seed: string
  readonly boards: readonly unknown[]
  readonly ghostBoards: readonly unknown[]
}

/** A claimed match result requires a full replay. Stopping before it ends counts as a loss. */
export function arbitrateGhost(record: GhostRecord) {
  const verdict = arbitrateDuel({
    mode: record.mode,
    seed: record.seed,
    ghost: true,
    ghostRounds: record.ghostBoards.length,
    boards: record.boards.flatMap((board, index) => [
      {
        round: index + 1,
        side: 0 as const,
        board,
      },
      {
        round: index + 1,
        side: 1 as const,
        board: record.ghostBoards[Math.min(index, record.ghostBoards.length - 1)],
      },
    ]),
  })

  // A broken pool entry is a server error: neutralize its rating without blaming the coach.
  const broken = verdict.kind === 'invalidBoard' && verdict.offender === 1
  const side = broken ? null : verdict.kind === 'incomplete' ? 1 : winningSide(verdict)

  return {
    verdict,
    side,
    neutralize: broken,
  }
}
