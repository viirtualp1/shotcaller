import type { FrameId, TitleId } from '@/content/progression'
import { HEROES } from '@/content/heroes'
import {
  LANE_IDS,
  ROLE_IDS,
  type HeroId,
  type ItemId,
  type LaneId,
  type ModeId,
  type RoleId,
  type StarLevel,
  type SynergyId,
} from '@/content/ids'
import { MODES } from '@/content/modes'
import type { Difficulty } from '@/content/rules'
import type { MatchResult } from '../match/judge'
import type { RoundPick } from '../match/matchStats'
import { totalStructureHp } from '../match/structures'
import type { HeroRecord, MatchRecord, ModeRatings, ProfileTotals, SynergyRecord } from './Profile'
import type { Verdict } from './progression'

/** One hero of a lineup as a profile shows it; lanes and items are missing on matches from before they were kept. */
export interface SummaryHero {
  readonly heroId: HeroId
  readonly stars: StarLevel
  readonly lane: LaneId | null
  readonly items: readonly ItemId[]
}

/** A finished match as a coach's dossier shows it. */
export interface MatchSummary {
  readonly id: string
  readonly playedAt: string
  readonly mode: ModeId
  /** Against another coach rather than the computer; who it was stays private. */
  readonly duel: boolean
  readonly difficulty: Difficulty
  readonly verdict: 'win' | 'loss' | 'draw'
  /** How it ended; null on matches from servers that did not hand it out. */
  readonly reason: MatchResult['reason'] | null
  readonly rounds: number
  readonly roundsWon: number
  readonly roundsLost: number
  readonly lineup: readonly SummaryHero[]
  readonly synergies: readonly SynergyId[]
  readonly mvp: HeroId | null
  readonly heroKills: number
  readonly towersDestroyed: number
  readonly ratingBefore: number
  readonly ratingAfter: number
  readonly xp: number
}

/**
 * How a coach plays, as friends and, for an open ranked profile, anyone on the leaderboard see it: rank, totals, the
 * heroes and synergies they win with, and their latest matches.
 */
export interface CoachDossier {
  readonly frame?: FrameId | null
  readonly title?: TitleId | null
  readonly id: string
  readonly name: string
  readonly avatar: string | null
  readonly photo: string | null
  readonly rating: number
  readonly ratings: ModeRatings
  readonly peakRating: number
  readonly xp: number
  /** Null for a coach who has not saved a profile yet. */
  readonly totals: ProfileTotals | null
  readonly heroes: Partial<Record<HeroId, HeroRecord>>
  readonly synergies: Partial<Record<SynergyId, SynergyRecord>>
  /** Newest first. */
  readonly recent: readonly MatchSummary[]
}

/** A hero's line in the pool: how often it was fielded and how it did. */
export interface PoolHero {
  readonly heroId: HeroId
  readonly matches: number
  readonly wins: number
  /** Whole percent. */
  readonly winRate: number
  readonly kills: number
  readonly deaths: number
  readonly bestStars: StarLevel
}

export interface RoleShare {
  readonly role: RoleId
  readonly matches: number
  /** Share of all hero appearances, 0 to 1. */
  readonly share: number
}

export interface SynergyLine {
  readonly id: SynergyId
  readonly matches: number
  readonly wins: number
  readonly winRate: number
}

/** A hero as the coach usually fields it on a lane. */
export interface SignatureHero {
  readonly heroId: HeroId
  readonly stars: StarLevel
  readonly items: readonly ItemId[]
  readonly appearances: number
}

export interface SignatureLineup {
  readonly mode: ModeId
  readonly matches: number
  readonly lanes: Readonly<Partial<Record<LaneId, readonly SignatureHero[]>>>
}

/** How a coach builds one hero over the latest matches. */
export interface HeroBuild {
  readonly heroId: HeroId
  readonly appearances: number
  readonly wins: number
  readonly stars: StarLevel
  readonly lane: LaneId | null
  readonly lanes: readonly { readonly lane: LaneId; readonly count: number }[]
  /** Most carried first. */
  readonly items: readonly { readonly item: ItemId; readonly count: number }[]
  /** A complete loadout actually fielded, rather than two items that may never have been worn together. */
  readonly loadout: readonly ItemId[]
}

/** A short trait of a coach's style, read from the numbers; the interface words it. */
export type StyleTag =
  | { readonly kind: 'throneBreaker'; readonly share: number }
  | { readonly kind: 'quickWins'; readonly rounds: number }
  | { readonly kind: 'soloMid' }
  | { readonly kind: 'synergy'; readonly id: SynergyId; readonly winRate: number }
  | { readonly kind: 'role'; readonly role: RoleId }
  | { readonly kind: 'duelist' }
  | { readonly kind: 'streak'; readonly wins: number }

export interface WinProfile {
  /** Share of wins taken by breaking the throne, 0 to 1; null without wins. */
  readonly throneShare: number | null
  /** Average length of the latest wins; null without any. */
  readonly averageWinRounds: number | null
  readonly fastestWin: number | null
}

/** One round of a match as the coach's own lineup changed: who was new, who gained a star. */
export interface LineupStep {
  readonly round: number
  readonly verdict: Verdict | null
  readonly heroes: readonly {
    readonly heroId: HeroId
    readonly stars: StarLevel
    readonly lane: LaneId
    readonly items: readonly ItemId[]
    readonly added: boolean
    readonly upgraded: boolean
    readonly moved: boolean
    readonly itemsChanged: boolean
  }[]
}

/** The coach's numbers side by side with the viewer's. */
export interface Comparison {
  readonly winRate: readonly [number, number]
  readonly matches: readonly [number, number]
  readonly throneShare: readonly [number | null, number | null]
  readonly fastestWin: readonly [number | null, number | null]
  /** Heroes both have played, with each one's win rate. */
  readonly heroes: readonly { readonly heroId: HeroId; readonly theirs: number; readonly ours: number }[]
}

const percent = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0)

/** Counts values and lists them from the most frequent; ties keep their first appearance. */
function tally<T>(values: Iterable<T>) {
  const counts = new Map<T, number>()
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1)
  }

  return [...counts]
    .sort((a, b) => b[1] - a[1])
    .map(([value, count]) => ({
      value,
      count,
    }))
}

const commonest = <T>(values: readonly T[], fallback: T) => tally(values)[0]?.value ?? fallback

/** The heroes a coach fields most, with how they do; a few matches make a hero count. */
export function heroPool(heroes: Partial<Record<HeroId, HeroRecord>>, limit = 6): PoolHero[] {
  return (Object.entries(heroes) as [HeroId, HeroRecord][])
    .filter(([, record]) => record.matches > 0)
    .sort(([, a], [, b]) => b.matches - a.matches || b.wins - a.wins)
    .slice(0, limit)
    .map(([heroId, record]) => ({
      heroId,
      matches: record.matches,
      wins: record.wins,
      winRate: percent(record.wins, record.matches),
      kills: record.kills,
      deaths: record.deaths,
      bestStars: record.bestStars,
    }))
}

/** Where a coach's heroes come from: every appearance counts for the hero's role; adaptive heroes for their own. */
export function roleShares(heroes: Partial<Record<HeroId, HeroRecord>>): RoleShare[] {
  const byRole = new Map<RoleId, number>(ROLE_IDS.map((role) => [role, 0]))
  let total = 0

  for (const [heroId, record] of Object.entries(heroes) as [HeroId, HeroRecord][]) {
    byRole.set(HEROES[heroId].role, (byRole.get(HEROES[heroId].role) ?? 0) + record.matches)
    total += record.matches
  }

  return ROLE_IDS.map((role) => ({
    role,
    matches: byRole.get(role) ?? 0,
    share: total > 0 ? (byRole.get(role) ?? 0) / total : 0,
  }))
}

export function synergyLines(synergies: Partial<Record<SynergyId, SynergyRecord>>, limit = 5): SynergyLine[] {
  return (Object.entries(synergies) as [SynergyId, SynergyRecord][])
    .filter(([, record]) => record.matches > 0)
    .sort(([, a], [, b]) => b.matches - a.matches || b.wins - a.wins)
    .slice(0, limit)
    .map(([id, record]) => ({
      id,
      matches: record.matches,
      wins: record.wins,
      winRate: percent(record.wins, record.matches),
    }))
}

const placed = (lineup: readonly SummaryHero[]) =>
  lineup.filter((hero): hero is SummaryHero & { lane: LaneId } => hero.lane !== null)

/**
 * The lineup a coach keeps coming back to on the mode they play most: for each lane, the heroes seen there most
 * often, as many as the lane usually holds, with their usual stars and items.
 */
export function signatureLineup(recent: readonly MatchSummary[]): SignatureLineup | null {
  const withLanes = recent.filter((match) => placed(match.lineup).length > 0)
  const mode = tally(withLanes.map((match) => match.mode))[0]?.value
  if (!mode) {
    return null
  }

  const matches = withLanes.filter((match) => match.mode === mode)
  const lanes: Partial<Record<LaneId, SignatureHero[]>> = {}

  for (const lane of MODES[mode].lanes) {
    const seen = matches.flatMap((match) => placed(match.lineup).filter((hero) => hero.lane === lane))
    const size = Math.round(seen.length / matches.length)
    if (size === 0) {
      continue
    }

    lanes[lane] = tally(seen.map((hero) => hero.heroId))
      .slice(0, Math.min(3, size))
      .map(({ value: heroId, count }) => {
        const copies = seen.filter((hero) => hero.heroId === heroId)

        return {
          heroId,
          stars: commonest(
            copies.map((hero) => hero.stars),
            1,
          ),
          items: tally(copies.flatMap((hero) => hero.items))
            .slice(0, 2)
            .map(({ value }) => value),
          appearances: count,
        }
      })
  }

  return {
    mode,
    matches: matches.length,
    lanes,
  }
}

/** How a hero is built over the latest matches; null when it was not fielded with its lane and items kept. */
export function heroBuild(recent: readonly MatchSummary[], heroId: HeroId): HeroBuild | null {
  const fielded = recent.flatMap((match) =>
    match.lineup
      .filter((hero) => hero.heroId === heroId)
      .map((hero) => ({
        hero,
        won: match.verdict === 'win',
      })),
  )

  if (fielded.length === 0) {
    return null
  }

  const lanes = tally(fielded.flatMap(({ hero }) => (hero.lane ? [hero.lane] : []))).map(
    ({ value, count }) => ({
      lane: value,
      count,
    }),
  )

  return {
    heroId,
    appearances: fielded.length,
    wins: fielded.filter(({ won }) => won).length,
    stars: commonest(
      fielded.map(({ hero }) => hero.stars),
      1,
    ),
    lane: lanes[0]?.lane ?? null,
    lanes,
    loadout: JSON.parse(
      commonest(
        fielded.map(({ hero }) => JSON.stringify([...hero.items].sort())),
        '[]',
      ),
    ) as ItemId[],
    items: tally(fielded.flatMap(({ hero }) => hero.items)).map(({ value, count }) => ({
      item: value,
      count,
    })),
  }
}

/** The heroes worth a build card: the pool first, then anyone else fielded lately. */
export function buildHeroes(dossier: CoachDossier): HeroId[] {
  const pool = heroPool(dossier.heroes, 12).map((hero) => hero.heroId)
  const lately = dossier.recent.flatMap((match) => match.lineup.map((hero) => hero.heroId))

  return [...new Set([...pool, ...lately])].filter((heroId) => heroBuild(dossier.recent, heroId) !== null)
}

/** Old to new, as a row of pips reads. */
export const form = (recent: readonly MatchSummary[]): Verdict[] =>
  recent.map((match) => match.verdict).reverse()

/** The rating over the latest duels, old to new; empty with fewer than two points to draw. */
export function ratingTrail(recent: readonly MatchSummary[], mode?: ModeId): number[] {
  const selected = mode ?? recent.find((match) => match.ratingAfter !== match.ratingBefore)?.mode

  const rated = recent
    .filter((match) => match.mode === selected && match.ratingAfter !== match.ratingBefore)
    .reverse()

  if (rated.length === 0) {
    return []
  }

  return [rated[0]!.ratingBefore, ...rated.map((match) => match.ratingAfter)]
}

export function winProfile(totals: ProfileTotals | null, recent: readonly MatchSummary[]): WinProfile {
  const wins = recent.filter((match) => match.verdict === 'win')

  return {
    throneShare: totals && totals.wins > 0 ? totals.throneWins / totals.wins : null,
    averageWinRounds: wins.length ? wins.reduce((sum, match) => sum + match.rounds, 0) / wins.length : null,
    fastestWin: totals?.fastestWin ?? null,
  }
}

/** Up to three traits, the most telling first. */
export function styleTags(dossier: CoachDossier): StyleTag[] {
  const tags: StyleTag[] = []
  const totals = dossier.totals
  const wins = winProfile(totals, dossier.recent)

  if (totals && totals.wins >= 3 && wins.throneShare !== null && wins.throneShare >= 0.5) {
    tags.push({
      kind: 'throneBreaker',
      share: Math.round(wins.throneShare * 100),
    })
  }

  const synergy = synergyLines(dossier.synergies).find((line) => line.matches >= 3 && line.winRate >= 60)
  if (synergy) {
    tags.push({
      kind: 'synergy',
      id: synergy.id,
      winRate: synergy.winRate,
    })
  }

  const threeLanes = dossier.recent.filter(
    (match) => match.mode === 'threeLanes' && placed(match.lineup).length,
  )

  const soloMid = threeLanes.filter(
    (match) => placed(match.lineup).filter((hero) => hero.lane === 'mid').length === 1,
  )

  if (threeLanes.length >= 3 && soloMid.length / threeLanes.length >= 0.5) {
    tags.push({ kind: 'soloMid' })
  }

  const role = roleShares(dossier.heroes).find((share) => share.matches >= 5 && share.share >= 0.4)
  if (role) {
    tags.push({
      kind: 'role',
      role: role.role,
    })
  }

  if (
    wins.averageWinRounds !== null &&
    wins.averageWinRounds <= 9 &&
    dossier.recent.filter((match) => match.verdict === 'win').length >= 3
  ) {
    tags.push({
      kind: 'quickWins',
      rounds: Math.round(wins.averageWinRounds),
    })
  }

  if (totals && totals.streak >= 3) {
    tags.push({
      kind: 'streak',
      wins: totals.streak,
    })
  }

  if (
    dossier.recent.length >= 4 &&
    dossier.recent.filter((match) => match.duel).length / dossier.recent.length >= 0.5
  ) {
    tags.push({ kind: 'duelist' })
  }

  return tags.slice(0, 3)
}

/**
 * The round that moved the match most: the widest gap between the building damage dealt and taken. The last round
 * has no health after it on record, so it is left out; null when no round had any damage.
 */
export function turningRound(record: MatchRecord): number | null {
  let best: number | null = null
  let widest = 0

  for (let i = 0; i + 1 < record.replays.length; i++) {
    const [oursBefore, theirsBefore] = record.replays[i]!.structures
    const [oursAfter, theirsAfter] = record.replays[i + 1]!.structures
    const dealt = totalStructureHp(theirsBefore) - totalStructureHp(theirsAfter)
    const taken = totalStructureHp(oursBefore) - totalStructureHp(oursAfter)
    const gap = Math.abs(dealt - taken)

    if (gap > widest) {
      widest = gap
      best = i + 1
    }
  }

  return best
}

/** The coach's own lineup round by round, marking heroes that joined and heroes that gained a star. */
export function lineupSteps(record: MatchRecord): LineupStep[] {
  return record.roundLineups.map(([ours], index) => {
    const previous = index > 0 ? record.roundLineups[index - 1]![0] : []
    const remaining: RoundPick[] = [...previous]

    return {
      round: index + 1,
      verdict: record.history[index] ?? null,
      heroes: LANE_IDS.flatMap((lane) =>
        ours
          .filter((pick) => pick[2] === lane)
          .map(([heroId, stars, pickLane, items]) => {
            let found = remaining.findIndex(
              (pick) => pick[0] === heroId && pick[2] === pickLane && pick[1] === stars,
            )

            if (found < 0) {
              found = remaining.findIndex((pick) => pick[0] === heroId && pick[2] === pickLane)
            }

            if (found < 0) {
              found = remaining.findIndex((pick) => pick[0] === heroId)
            }

            const before = found < 0 ? null : remaining.splice(found, 1)[0]!

            return {
              heroId,
              stars,
              lane: pickLane,
              items,
              added: index > 0 && before === null,
              upgraded: before !== null && before[1] < stars,
              moved: before !== null && before[2] !== pickLane,
              itemsChanged:
                before !== null &&
                JSON.stringify([...before[3]].sort()) !== JSON.stringify([...items].sort()),
            }
          }),
      ),
    }
  })
}

/** The viewed coach against the viewer, on the numbers both have. */
export function compare(
  theirs: Pick<CoachDossier, 'totals' | 'heroes' | 'recent'>,
  ours: Pick<CoachDossier, 'totals' | 'heroes' | 'recent'>,
): Comparison {
  const winRate = (totals: ProfileTotals | null) => (totals ? percent(totals.wins, totals.matches) : 0)
  const theirWins = winProfile(theirs.totals, theirs.recent)
  const ourWins = winProfile(ours.totals, ours.recent)

  return {
    winRate: [winRate(theirs.totals), winRate(ours.totals)],
    matches: [theirs.totals?.matches ?? 0, ours.totals?.matches ?? 0],
    throneShare: [theirWins.throneShare, ourWins.throneShare],
    fastestWin: [theirWins.fastestWin, ourWins.fastestWin],
    heroes: heroPool(theirs.heroes, 6)
      .filter((hero) => (ours.heroes[hero.heroId]?.matches ?? 0) > 0)
      .map((hero) => ({
        heroId: hero.heroId,
        theirs: hero.winRate,
        ours: percent(ours.heroes[hero.heroId]!.wins, ours.heroes[hero.heroId]!.matches),
      })),
  }
}
