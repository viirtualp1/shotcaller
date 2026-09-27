import type { TeamId } from '@/content/ids'
import { MATCH } from '@/content/rules'
import type { BattleOutcome, PerTeam, StructureState, TeamBattleStats } from '../battle/contracts'
import type { RoundVerdict } from '../player/Player'
import { STRUCTURE_SLOTS, totalStructureHp } from './structures'

export interface MatchResult {
  readonly winner: TeamId | null
  readonly reason: 'throne' | 'roundLimit'
}

export const totalStructureDamage = (stats: TeamBattleStats) =>
  STRUCTURE_SLOTS.reduce((sum, slot) => sum + stats.structureDamage[slot], 0)

export const verdictFor = (team: TeamId, winner: TeamId | null): RoundVerdict =>
  winner === null ? 'draw' : winner === team ? 'win' : 'loss'

export function judgeRound(outcome: BattleOutcome) {
  if (outcome.throneFell !== null) {
    return outcome.throneFell === 0 ? 1 : 0
  }

  const [ours, theirs] = outcome.stats.map(totalStructureDamage) as [number, number]
  if (Math.abs(ours - theirs) < MATCH.drawThreshold) {
    return null
  }

  return ours > theirs ? 0 : 1
}

export function judgeMatch(structures: PerTeam<StructureState>, round: number): MatchResult | null {
  const fallen = structures.findIndex((s) => s.throne <= 0)
  if (fallen >= 0) {
    return {
      winner: fallen === 0 ? 1 : 0,
      reason: 'throne',
    }
  }

  if (round < MATCH.maxRounds) {
    return null
  }

  const [ours, theirs] = structures.map(totalStructureHp) as [number, number]
  return {
    winner: ours === theirs ? null : ours > theirs ? 0 : 1,
    reason: 'roundLimit',
  }
}
