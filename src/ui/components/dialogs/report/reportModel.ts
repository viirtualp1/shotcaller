import type { PerTeam } from '@/domain/battle/contracts'
import type { HeroMatchStats } from '@/domain/match/matchStats'

export type HeroStatKey = keyof Pick<
  HeroMatchStats,
  | 'rounds'
  | 'kills'
  | 'deaths'
  | 'lastHits'
  | 'damageDealt'
  | 'structureDamage'
  | 'damageReceived'
  | 'healing'
>

export const HERO_COLUMNS: readonly HeroStatKey[] = [
  'rounds',
  'kills',
  'deaths',
  'lastHits',
  'damageDealt',
  'structureDamage',
  'damageReceived',
  'healing',
]

export interface ComparisonRow {
  readonly key: string
  readonly label: string
  readonly values: PerTeam<number>
}
