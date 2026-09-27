import { HEROES } from '@/content/heroes'
import {
  ITEM_IDS,
  LANE_IDS,
  opponentOf,
  type HeroId,
  type ItemId,
  type LaneId,
  type StarLevel,
  type TeamId,
} from '@/content/ids'
import { ITEMS, ITEM_SLOTS, STASH_SIZE } from '@/content/items'
import { COPIES_PER_STAR, MATCH, MERGE_COUNT, ROSTER, SHOP_ODDS } from '@/content/rules'
import type { PerTeam, StructureState } from '@/domain/battle/contracts'
import { findRecruit } from '@/domain/coach/recruit'
import type { MatchResult } from '@/domain/match/judge'
import type { Match, MatchPhase, RoundSummary } from '@/domain/match/Match'
import type { HeroMatchStats, TeamMatchStats } from '@/domain/match/matchStats'
import type { Ledger } from '@/domain/player/ledger'
import { itemSellValue, sellValue, type Player } from '@/domain/player/Player'
import type { OwnedHero } from '@/domain/roster/Roster'
import { resolveLane, type LaneReport, type SynergySuggestion } from '@/domain/synergy/resolveLane'
import type { BattleSimulation, HeroStatus } from '@/simulation/BattleSimulation'

export interface HeroCardView {
  readonly uid: string
  readonly heroId: HeroId
  readonly stars: StarLevel
  readonly sellValue: number
  readonly items: readonly ItemId[]
  readonly freeItemSlots: number
}

export interface ShopOfferView {
  readonly slot: number
  readonly heroId: HeroId | null
  readonly affordable: boolean
  readonly ownedCopies: number
  /** Buying this card completes a set of three and promotes the hero. */
  readonly completesSet: boolean
}

export interface ItemOfferView {
  readonly itemId: ItemId
  readonly cost: number
  readonly affordable: boolean
}

export interface StashItemView {
  readonly index: number
  readonly itemId: ItemId
  readonly sellValue: number
}

export interface SuggestionView extends SynergySuggestion {
  /** A hero who switches the synergy on in one move, when the player has one to spare. */
  readonly recruit: { readonly uid: string; readonly heroId: HeroId } | null
}

export interface LaneView {
  readonly lane: LaneId
  readonly heroes: readonly HeroCardView[]
  readonly report: Pick<LaneReport, 'synergies'> & { readonly suggestions: readonly SuggestionView[] }
}

export interface PlayerView {
  readonly team: TeamId
  readonly gold: number
  readonly level: number
  readonly maxLevel: number
  readonly xp: number
  readonly xpToNext: number
  readonly isMaxLevel: boolean
  readonly boardCount: number
  readonly boardCapacity: number
  readonly benchSize: number
  readonly streak: number
  readonly bench: readonly HeroCardView[]
  readonly lanes: Readonly<Record<LaneId, LaneView>>
  readonly shop: readonly ShopOfferView[]
  readonly shopOdds: readonly number[]
  readonly stash: readonly StashItemView[]
  readonly stashSize: number
  readonly itemShop: readonly ItemOfferView[]
}

export interface TeamReportView {
  readonly stats: TeamMatchStats
  readonly ledger: Readonly<Ledger>
  readonly level: number
  /** Enemy towers this team brought down. */
  readonly towersDestroyed: number
}

/** The post-game screen: totals for the whole match, never broken down by round. */
export interface MatchReportView {
  readonly rounds: number
  readonly draws: number
  readonly teams: PerTeam<TeamReportView>
  readonly heroes: readonly HeroMatchStats[]
}

export interface MatchView {
  readonly round: number
  readonly maxRounds: number
  readonly phase: MatchPhase
  readonly structures: PerTeam<StructureState>
  readonly human: PlayerView
  readonly opponent: PlayerView
  readonly summary: RoundSummary | null
  readonly result: MatchResult | null
  readonly report: MatchReportView | null
}

export interface LiveBattleView {
  readonly elapsed: number
  readonly duration: number
  readonly structures: PerTeam<StructureState>
  readonly heroes: ReadonlyMap<string, HeroStatus>
}

const toCard = (hero: OwnedHero) => ({
  uid: hero.uid,
  heroId: hero.heroId,
  stars: hero.stars,
  sellValue: sellValue(hero),
  items: [...hero.items],
  freeItemSlots: ITEM_SLOTS - hero.items.length,
})

const perLane = <T>(build: (lane: LaneId) => T) => ({
  top: build('top'),
  mid: build('mid'),
  bot: build('bot'),
})

function toLaneView(player: Player, lane: LaneId) {
  const heroes = player.roster.lane(lane)

  const report = resolveLane(
    lane,
    heroes.map((h) => h.heroId),
  )

  return {
    lane,
    heroes: heroes.map(toCard),
    report: {
      synergies: report.synergies,
      suggestions: report.suggestions.map((suggestion) => {
        const recruit = findRecruit(player.roster, player.boardCapacity, lane, suggestion.roles)

        return {
          ...suggestion,
          recruit: recruit && {
            uid: recruit.uid,
            heroId: recruit.heroId,
          },
        }
      }),
    },
  }
}

function toPlayerView(player: Player) {
  const owned = player.roster.all()

  const copiesOf = (id: HeroId) =>
    owned.filter((h) => h.heroId === id).reduce((sum, h) => sum + COPIES_PER_STAR[h.stars], 0)

  const singlesOf = (id: HeroId) => owned.filter((h) => h.heroId === id && h.stars === 1).length
  const gold = player.wallet.gold
  return {
    team: player.team,
    gold,
    level: player.level,
    maxLevel: ROSTER.maxLevel,
    xp: player.progression.xp,
    xpToNext: player.progression.xpToNext,
    isMaxLevel: player.progression.isMaxLevel,
    boardCount: player.roster.boardCount,
    boardCapacity: player.boardCapacity,
    benchSize: player.roster.benchSize,
    streak: player.streak,
    bench: player.roster.bench.map(toCard),
    lanes: perLane((lane) => toLaneView(player, lane)),
    shop: player.shop.slots.map((heroId, slot) => ({
      slot,
      heroId,
      affordable: heroId !== null && HEROES[heroId].tier <= gold,
      ownedCopies: heroId ? copiesOf(heroId) : 0,
      completesSet: heroId !== null && singlesOf(heroId) >= MERGE_COUNT - 1,
    })),
    shopOdds: SHOP_ODDS[player.level],
    stash: player.stash.items.map((itemId, index) => ({
      index,
      itemId,
      sellValue: itemSellValue(itemId),
    })),
    stashSize: STASH_SIZE,
    itemShop: ITEM_IDS.map((itemId) => ({
      itemId,
      cost: ITEMS[itemId].cost,
      affordable: ITEMS[itemId].cost <= gold,
    })),
  }
}

function toMatchReport(match: Match): MatchReportView {
  const team = (id: TeamId) => {
    const enemyStructures = match.structures[opponentOf(id)]

    return {
      stats: match.stats.teams[id],
      ledger: { ...match.players[id].ledger },
      level: match.players[id].level,
      towersDestroyed: LANE_IDS.filter((lane) => enemyStructures[lane] <= 0).length,
    }
  }

  return {
    rounds: match.stats.rounds,
    draws: match.stats.draws,
    teams: [team(0), team(1)],
    heroes: [...match.stats.heroes].sort((a, b) => b.damageDealt - a.damageDealt),
  }
}

export function toMatchView(match: Match): MatchView {
  return {
    round: match.round,
    maxRounds: MATCH.maxRounds,
    phase: match.phase,
    structures: [{ ...match.structures[0] }, { ...match.structures[1] }],
    human: toPlayerView(match.human),
    opponent: toPlayerView(match.opponent),
    summary: match.lastSummary,
    result: match.result,
    report: match.phase === 'finished' ? toMatchReport(match) : null,
  }
}

export function toLiveBattleView(simulation: BattleSimulation) {
  return {
    elapsed: simulation.elapsed,
    duration: simulation.duration,
    structures: simulation.structureHealth(),
    heroes: simulation.heroStatus(),
  }
}
