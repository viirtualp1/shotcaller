import { ECONOMY } from '@/content/rules'
import type { TeamBattleStats } from '../battle/contracts'

export interface IncomeBreakdown {
  readonly base: number
  readonly interest: number
  readonly farm: number
  readonly win: number
  readonly total: number
}

export function computeIncome(currentGold: number, stats: TeamBattleStats, won: boolean) {
  const base = ECONOMY.baseIncome
  const interest = Math.min(Math.floor(currentGold / ECONOMY.goldPerInterest), ECONOMY.maxInterest)

  const farm = Math.min(
    Math.floor(stats.creepKills / ECONOMY.creepKillsPerGold) + stats.heroKills,
    ECONOMY.maxFarmIncome,
  )

  const win = won ? ECONOMY.winBonus : 0
  return {
    base,
    interest,
    farm,
    win,
    total: base + interest + farm + win,
  }
}
