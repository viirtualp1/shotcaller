import type { HeroBattleReport } from '@/domain/battle/contracts'

export type MeterStat = 'damageDealt' | 'healing' | 'damageReceived'

export type MeterHero = Pick<
  HeroBattleReport,
  'uid' | 'team' | 'heroId' | 'stars' | 'lane' | 'items' | MeterStat
> & { readonly dead?: boolean }
