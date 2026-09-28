import type { ModeId, TeamId } from '@/content/ids'
import { MODES } from '@/content/modes'
import { MATCH } from '@/content/rules'
import type { BattleOutcome, PerTeam, StructureState, TeamBattleStats } from '../battle/contracts'
import type { RoundVerdict } from '../player/Player'
import { STRUCTURE_SLOTS, totalStructureHp } from './structures'

export const MATCH_END_REASONS = ['throne', 'roundLimit', 'forfeit'] as const

export interface MatchResult {
  readonly winner: TeamId | null
  /** `forfeit` is a duel given up, or claimed after the other coach went silent. */
  readonly reason: (typeof MATCH_END_REASONS)[number]
}

export const totalStructureDamage = (stats: TeamBattleStats) =>
  STRUCTURE_SLOTS.reduce((sum, slot) => sum + stats.structureDamage[slot], 0)

/** What a round is judged on: building damage, plus hero kills in modes where they count. */
export const roundScore = (stats: TeamBattleStats, mode: ModeId) =>
  totalStructureDamage(stats) + stats.heroKills * MODES[mode].killScore

export const verdictFor = (team: TeamId, winner: TeamId | null): RoundVerdict =>
  winner === null ? 'draw' : winner === team ? 'win' : 'loss'

export function judgeRound(outcome: BattleOutcome, mode: ModeId) {
  if (outcome.throneFell !== null) {
    return outcome.throneFell === 0 ? 1 : 0
  }

  const [ours, theirs] = outcome.stats.map((stats) => roundScore(stats, mode)) as [number, number]
  if (Math.abs(ours - theirs) < MATCH.drawThreshold) {
    return null
  }

  return ours > theirs ? 0 : 1
}

export function judgeMatch(
  structures: PerTeam<StructureState>,
  round: number,
  mode: ModeId,
): MatchResult | null {
  const fallen = structures.findIndex((s) => s.throne <= 0)
  if (fallen >= 0) {
    return {
      winner: fallen === 0 ? 1 : 0,
      reason: 'throne',
    }
  }

  if (round < MODES[mode].maxRounds) {
    return null
  }

  const [ours, theirs] = structures.map(totalStructureHp) as [number, number]
  return {
    winner: ours === theirs ? null : ours > theirs ? 0 : 1,
    reason: 'roundLimit',
  }
}
