import { HEROES } from '@/content/heroes'
import type { TrialId } from '@/content/career'
import {
  HERO_IDS,
  SHOP_ITEM_IDS,
  opponentOf,
  type HeroId,
  type ItemId,
  type LaneId,
  type LaneStance,
  type ModeId,
  type RoleId,
  type ShopItemId,
  type FactionId,
  type StarLevel,
  type TeamId,
} from '@/content/ids'
import { ITEMS, ITEM_SLOTS, STASH_SIZE, upgradeOf } from '@/content/items'
import { MODES } from '@/content/modes'
import { COPIES_PER_STAR, MERGE_COUNT } from '@/content/rules'
import type { TwistId } from '@/content/experiments'
import type { FactionTier } from '@/content/factions'
import type { SandboxSettings } from '@/content/sandbox'
import type { TalentChoice } from '@/content/talents'
import type { PerTeam, StructureState } from '@/domain/battle/contracts'
import { fromSide, seenFrom } from '@/domain/battle/mirror'
import { findRecruit } from '@/domain/coach/recruit'
import { verdictFor, type MatchResult } from '@/domain/match/judge'
import type { Match, MatchPhase, RoundSummary } from '@/domain/match/Match'
import type { HeroMatchStats, TeamMatchStats } from '@/domain/match/matchStats'
import type { Ledger } from '@/domain/player/ledger'
import { itemSellValue, sellValue, type Player, type RoundVerdict } from '@/domain/player/Player'
import { wouldPromote } from '@/domain/roster/promotion'
import type { OwnedHero } from '@/domain/roster/Roster'
import type { FactionStanding } from '@/domain/synergy/laneFactions'
import { resolveLane, type LaneReport, type SynergySuggestion } from '@/domain/synergy/resolveLane'
import type { BattleSimulation, HeroStatus } from '@/simulation/BattleSimulation'

export interface HeroCardView {
  readonly uid: string
  readonly heroId: HeroId
  readonly stars: StarLevel
  readonly sellValue: number
  readonly items: readonly ItemId[]
  readonly freeItemSlots: number
  /** The role the hero fights in on its lane; missing on the bench, where an adaptive hero has none yet. */
  readonly role?: RoleId
  /** Soul Jar charges the hero has kept. */
  readonly souls: number
  readonly talent?: TalentChoice
  /** Reached two stars and waits for the coach to pick a talent. */
  readonly pendingTalent: boolean
  /** The faction the hero counts for on its lane, a Changeling's included; missing on the bench. */
  readonly faction?: FactionId
  /** The step that faction reaches on the lane, when it reaches one. */
  readonly factionTier?: FactionTier
}

export interface ShopOfferView {
  readonly slot: number
  readonly heroId: HeroId | null
  readonly affordable: boolean
  readonly ownedCopies: number
  /** Buying this card completes a set of three and promotes the hero. */
  readonly completesSet: boolean
  /** The bought hero has somewhere to go: a free bench slot or an instant promotion. */
  readonly fits: boolean
  /** Other heroes of its faction the player owns, who could share a lane with it. */
  readonly kin: number
}

/** Where a bought copy meets its pair: in the stash at once, or when it is given to the hero who carries one. */
export type ItemForge = 'buy' | 'equip'

export interface ItemOfferView {
  readonly itemId: ItemId
  readonly cost: number
  readonly affordable: boolean
  /** The stash has room for it. */
  readonly fits: boolean
  /** Copies owned, counting an upgrade as the two it was made from. */
  readonly ownedCopies: number
  /** Buying this item can make its upgrade; null without a plain copy to pair with. */
  readonly forge: ItemForge | null
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
  /** The coach's order for the lane; null leaves it to the heroes. */
  readonly stance: LaneStance | null
  readonly heroes: readonly HeroCardView[]
  readonly report: Pick<LaneReport, 'synergies'> & {
    readonly suggestions: readonly SuggestionView[]
    readonly factions: readonly FactionStanding[]
  }
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
  /** Every hero, cheapest tier first, as the training ground offers them; `slot` indexes `HERO_IDS`. */
  readonly catalog: readonly ShopOfferView[]
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
  readonly mode: ModeId
  readonly trialId: TrialId | null
  readonly round: number
  readonly maxRounds: number
  readonly phase: MatchPhase
  readonly structures: PerTeam<StructureState>
  readonly human: PlayerView
  readonly opponent: PlayerView
  readonly summary: RoundSummary | null
  /** The team the player fights as; everything else in the view is already seen from their side. */
  readonly side: TeamId
  /** Rounds played so far, as the human player saw them. */
  readonly history: readonly RoundVerdict[]
  readonly result: MatchResult | null
  readonly report: MatchReportView | null
  /** The training ground's dummies and creeps; null in a real match. */
  readonly sandbox: SandboxSettings | null
  /** The round's twist when the match plays with twists. */
  readonly twist: TwistId | null
  /** Heroes in this match's pool when it plays with rotation. */
  readonly rotation: readonly HeroId[] | null
}

export interface LiveBattleView {
  readonly elapsed: number
  readonly duration: number
  readonly structures: PerTeam<StructureState>
  readonly heroes: ReadonlyMap<string, HeroStatus>
}

interface LanePlace {
  readonly role: RoleId
  readonly faction: FactionId | null
  readonly factionTier: FactionTier | null
}

const toCard = (hero: OwnedHero, place?: LanePlace): HeroCardView => ({
  uid: hero.uid,
  heroId: hero.heroId,
  stars: hero.stars,
  sellValue: sellValue(hero),
  items: [...hero.items],
  freeItemSlots: ITEM_SLOTS - hero.items.length,
  ...(place ? { role: place.role } : {}),
  ...(place?.faction ? { faction: place.faction } : {}),
  ...(place?.factionTier ? { factionTier: place.factionTier } : {}),
  souls: hero.souls ?? 0,
  ...(hero.talent !== undefined ? { talent: hero.talent } : {}),
  pendingTalent: hero.stars === 2 && hero.talent === undefined,
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
    player.mode,
  )

  return {
    lane,
    stance: player.roster.stances()[lane] ?? null,
    heroes: heroes.map((hero, i) =>
      toCard(hero, {
        role: report.roles[i]!,
        faction: report.factions.heroFactions[i] ?? null,
        factionTier: report.factions.bonusFor(i)?.tier ?? null,
      }),
    ),
    report: {
      synergies: report.synergies,
      factions: report.factions.standings,
      suggestions: report.suggestions.map((suggestion) => {
        const recruit = findRecruit(player.roster, player.boardCapacity, lane, suggestion.roles, player.mode)

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

  const kinOf = (id: HeroId) =>
    new Set(
      owned
        .filter((h) => h.heroId !== id && HEROES[h.heroId].faction !== null)
        .filter((h) => HEROES[h.heroId].faction === HEROES[id].faction)
        .map((h) => h.heroId),
    ).size

  const carried = owned.flatMap((hero) => hero.items)
  const items = [...player.stash.items, ...carried]

  const itemCopiesOf = (id: ShopItemId) =>
    items.filter((item) => item === id).length + 2 * items.filter((item) => item === upgradeOf(id)).length

  const itemForge = (id: ShopItemId): ItemForge | null => {
    if (player.stash.items.includes(id)) {
      return 'buy'
    }

    return carried.includes(id) ? 'equip' : null
  }

  const gold = player.wallet.gold
  return {
    team: player.team,
    gold,
    level: player.level,
    maxLevel: player.progression.maxLevel,
    xp: player.progression.xp,
    xpToNext: player.progression.xpToNext,
    isMaxLevel: player.progression.isMaxLevel,
    boardCount: player.roster.boardCount,
    boardCapacity: player.boardCapacity,
    benchSize: player.roster.benchSize,
    streak: player.streak,
    bench: player.roster.bench.map((hero) => toCard(hero)),
    lanes: perLane((lane) => toLaneView(player, lane)),
    shop: player.shop.slots.map((heroId, slot) => ({
      slot,
      heroId,
      affordable: heroId !== null && HEROES[heroId].tier <= gold,
      ownedCopies: heroId ? copiesOf(heroId) : 0,
      completesSet: heroId !== null && singlesOf(heroId) >= MERGE_COUNT - 1,
      fits: heroId !== null && (player.roster.hasBenchSpace || wouldPromote(player.roster, heroId)),
      kin: heroId ? kinOf(heroId) : 0,
    })),
    catalog: HERO_IDS.map((heroId, slot) => ({
      slot,
      heroId,
      affordable: true,
      ownedCopies: copiesOf(heroId),
      completesSet: singlesOf(heroId) >= MERGE_COUNT - 1,
      fits: player.roster.hasBenchSpace || wouldPromote(player.roster, heroId),
      kin: kinOf(heroId),
    })).sort((a, b) => HEROES[a.heroId].tier - HEROES[b.heroId].tier),
    shopOdds: player.progression.rules.odds,
    stash: player.stash.items.map((itemId, index) => ({
      index,
      itemId,
      sellValue: itemSellValue(itemId),
    })),
    stashSize: STASH_SIZE,
    itemShop: SHOP_ITEM_IDS.map((itemId) => ({
      itemId,
      cost: ITEMS[itemId].cost,
      affordable: ITEMS[itemId].cost <= gold,
      /* A full stash still takes a copy of an item it holds: the two merge. */
      fits: player.stash.accepts(itemId),
      ownedCopies: itemCopiesOf(itemId),
      forge: itemForge(itemId),
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
      towersDestroyed: MODES[match.mode].towers.filter((slot) => enemyStructures[slot] <= 0).length,
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
    mode: match.mode,
    trialId: match.trialId,
    round: match.round,
    maxRounds: MODES[match.mode].maxRounds,
    phase: match.phase,
    structures: [{ ...match.structures[0] }, { ...match.structures[1] }],
    human: toPlayerView(match.human),
    opponent: toPlayerView(match.opponent),
    summary: match.lastSummary,
    side: match.side,
    history: match.stats.winners.map((winner) => verdictFor(match.human.team, winner)),
    result: match.result,
    report: match.phase === 'finished' ? toMatchReport(match) : null,
    sandbox: match.sandbox,
    twist: match.twist,
    rotation: match.rotation,
  }
}

/** The simulation reports in battle order; the view is seen from the side the player fights as. */
export function toLiveBattleView(simulation: BattleSimulation, side: TeamId) {
  const heroes = simulation.heroStatus()

  return {
    elapsed: simulation.elapsed,
    duration: simulation.duration,
    structures: fromSide(side, simulation.structureHealth()),
    heroes:
      side === 0
        ? heroes
        : new Map(
            [...heroes].map(([uid, status]) => [
              uid,
              {
                ...status,
                team: seenFrom(side, status.team),
              },
            ]),
          ),
  }
}
