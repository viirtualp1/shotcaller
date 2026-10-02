import type { Difficulty } from '@/content/rules'
import { fromSide } from '../battle/mirror'
import type { Match, MatchPhase } from '../match/Match'
import { picksOf } from '../match/matchStats'
import { matchRecordOf, type MatchRecord } from '../profile/Profile'

export interface LiveMatch {
  readonly record: MatchRecord
  readonly round: number
  readonly phase: MatchPhase
  readonly elapsed: number
}

/** A viewing snapshot, never submitted as a finished match or used to award XP. */
export function liveMatchOf(match: Match, difficulty: Difficulty, id: string, elapsed: number): LiveMatch {
  const battle = match.pendingBattle
  const stats = match.stats

  const record = matchRecordOf(
    {
      mode: match.mode,
      difficulty,
      result: match.result ?? {
        winner: null,
        reason: 'roundLimit',
      },
      stats,
      lineup: match.human.roster.lineup(),
      opponentLineup: match.opponent.roster.lineup(),
      side: match.side,
      towersDestroyed: 0,
      duel: null,
      trialId: match.trialId,
    },
    {
      id,
      playedAt: new Date().toISOString(),
    },
  )

  if (!battle) {
    return {
      record,
      round: match.round,
      phase: match.phase,
      elapsed,
    }
  }

  const lineups = fromSide(match.side, battle.lineups)

  return {
    record: {
      ...record,
      roundLineups: [...stats.lineups, [picksOf(lineups[0]), picksOf(lineups[1])]],
      replays: [
        ...stats.replays,
        {
          seed: battle.seed,
          structures: fromSide(match.side, battle.structures),
          stances: fromSide(match.side, battle.stances ?? [{}, {}]),
        },
      ],
    },
    round: match.round,
    phase: match.phase,
    elapsed,
  }
}
