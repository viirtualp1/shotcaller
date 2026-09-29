import { BALANCE_FINGERPRINT } from '@/content/balance'
import type { HeroId, ItemId, LaneId, StarLevel, TeamId } from '@/content/ids'
import type { BattleSetup } from '../battle/contracts'
import { fromSide } from '../battle/mirror'
import type { RoundPick } from '../match/matchStats'
import type { MatchRecord } from '../profile/Profile'
import type { Lineup, OwnedHero } from '../roster/Roster'

/** A hero of one recorded round, as the match's owner saw them. The uid is the one the battle token uses. */
export interface ReplayHero {
  readonly uid: string
  readonly team: TeamId
  readonly heroId: HeroId
  readonly stars: StarLevel
  readonly lane: LaneId
  readonly items: readonly ItemId[]
}

/** `ready` can be watched. `stale` was saved, but the balance has moved on. `missing` never recorded a fight. */
export type ReplayAvailability = 'ready' | 'stale' | 'missing'

export function replayAvailability(record: MatchRecord): ReplayAvailability {
  /* A match already under way when replays came in has lineups for rounds without a tape: the lists no longer line up. */
  if (record.replays.length === 0 || record.replays.length !== record.roundLineups.length) {
    return 'missing'
  }

  return record.balance === BALANCE_FINGERPRINT ? 'ready' : 'stale'
}

function castOf(team: TeamId, [heroId, stars, lane, items]: RoundPick, index: number): ReplayHero {
  return {
    uid: `${team}:${lane}:${index}`,
    team,
    heroId,
    stars,
    lane,
    items,
  }
}

function lineupOf(picks: readonly RoundPick[], team: TeamId): Lineup {
  const lanes: Record<LaneId, OwnedHero[]> = {
    top: [],
    mid: [],
    bot: [],
  }

  picks.forEach((pick, index) => {
    const hero = castOf(team, pick, index)

    lanes[hero.lane].push({
      uid: hero.uid,
      heroId: hero.heroId,
      stars: hero.stars,
      items: [...hero.items],
    })
  })

  return lanes
}

/** Both lineups of a round, the owner's heroes first. Null when that round cannot be watched. */
export function replayRoundHeroes(record: MatchRecord, round: number): readonly ReplayHero[] | null {
  if (replayAvailability(record) !== 'ready') {
    return null
  }

  const picks = record.roundLineups[round - 1]
  if (!picks) {
    return null
  }

  return ([0, 1] as const).flatMap((team) => picks[team].map((pick, index) => castOf(team, pick, index)))
}

/** The battle to run for one recorded round, in the same order the match simulated it. */
export function replaySetup(record: MatchRecord, round: number): { side: TeamId; setup: BattleSetup } | null {
  if (replayAvailability(record) !== 'ready') {
    return null
  }

  const tape = record.replays[round - 1]
  const picks = record.roundLineups[round - 1]
  if (!tape || !picks) {
    return null
  }

  const seen = [lineupOf(picks[0], 0), lineupOf(picks[1], 1)] as const

  return {
    side: record.side,
    setup: {
      mode: record.mode,
      round,
      seed: tape.seed,
      lineups: fromSide(record.side, seen),
      structures: fromSide(record.side, tape.structures),
    },
  }
}
