import { z } from 'zod'
import { TRIAL_IDS } from '@/content/career'
import { HERO_IDS, ITEM_IDS, LANE_IDS, LANE_STANCES, MODE_IDS, type ModeId } from '@/content/ids'
import { ITEM_SLOTS, STASH_SIZE } from '@/content/items'
import { DEFAULT_MODE, levelRules, MODES } from '@/content/modes'
import { ROSTER } from '@/content/rules'
import { MATCH_END_REASONS } from '@/domain/match/judge'
import type { MatchState } from '@/domain/match/Match'
import { emptyMatchStats } from '@/domain/match/matchStats'
import { emptyLedger } from '@/domain/player/ledger'

/** 2 numbered coach levels from 1; saves of version 1 started at 2. */
const SNAPSHOT_VERSION = 2

const team = z.union([z.literal(0), z.literal(1)])
const pair = <T extends z.ZodType>(schema: T) => z.tuple([schema, schema]).readonly()
const heroId = z.enum(HERO_IDS)
const itemId = z.enum(ITEM_IDS)
const stars = z.union([z.literal(1), z.literal(2), z.literal(3)])
const level = z.int().min(1).max(5)
const amount = z.number().nonnegative()
/** Matches saved before game modes were all three lanes. */
const mode = z.enum(MODE_IDS).default(DEFAULT_MODE)

const ownedHero = z.object({
  uid: z.string().min(1),
  heroId,
  stars,
  items: z.array(itemId).max(ITEM_SLOTS),
})

const lineup = z.object({
  top: z.array(ownedHero),
  mid: z.array(ownedHero),
  bot: z.array(ownedHero),
})

const stances = z.partialRecord(z.enum(LANE_IDS), z.enum(LANE_STANCES))

const structures = z.object({
  top: amount,
  mid: amount,
  bot: amount,
  inner: amount.default(0),
  throne: amount,
})

const player = z.object({
  gold: amount,
  level,
  xp: amount,
  streak: z.int(),
  roster: z.object({
    bench: z.array(ownedHero),
    lanes: lineup,
    /** Lane orders came later; boards and saves without them leave every lane to its heroes. */
    stances: stances.default({}),
  }),
  shop: z.array(heroId.nullable()),
  stash: z.array(itemId),
  ledger: z
    .object({
      heroesBought: amount,
      heroesSold: amount,
      promotions: amount,
      itemsBought: amount,
      itemsSold: amount,
      rerolls: amount,
      xpBought: amount,
      goldSpent: amount,
      goldFromSales: amount,
    })
    .default(emptyLedger),
})

const income = z.object({
  base: amount,
  interest: amount,
  farm: amount,
  win: amount,
  total: amount,
})

const heroReport = z.object({
  uid: z.string(),
  team,
  heroId,
  stars,
  lane: z.enum(LANE_IDS).optional(),
  items: z.array(itemId).optional(),
  damageDealt: amount,
  damageReceived: amount.default(0),
  structureDamage: amount.default(0),
  healing: amount.default(0),
  lastHits: amount.default(0),
  kills: amount,
  deaths: amount,
})

const summary = z.object({
  round: z.int().positive(),
  winner: team.nullable(),
  structureDamage: pair(amount),
  /** Saved before kills could count, when the score was the building damage. */
  score: pair(amount).optional(),
  laneDamage: z.object({
    top: pair(amount),
    mid: pair(amount),
    bot: pair(amount),
    inner: pair(amount).default([0, 0]),
    throne: pair(amount),
  }),
  heroKills: pair(amount),
  income: pair(income),
  mvp: heroReport.nullable(),
  heroes: z.array(heroReport).default([]),
})

const scoredSummary = summary.transform(({ score, ...rest }) => ({
  ...rest,
  score: score ?? rest.structureDamage,
}))

const teamStats = z.object({
  roundsWon: amount,
  heroKills: amount,
  creepKills: amount,
  structureDamage: structures,
  income: income,
})

const heroStats = z.object({
  team,
  /** Rows kept before 8.8 summed every copy of a hero and have no uid. */
  uid: z.string().max(64).optional(),
  heroId,
  lane: z.enum(LANE_IDS).optional(),
  bestStars: stars,
  rounds: amount,
  damageDealt: amount,
  damageReceived: amount,
  structureDamage: amount,
  healing: amount,
  lastHits: amount,
  kills: amount,
  deaths: amount,
})

/** A hero as it fought one round: id, stars, lane and items. */
const roundPick = z
  .tuple([heroId, stars, z.enum(LANE_IDS), z.array(itemId).max(ITEM_SLOTS).readonly()])
  .readonly()

const roundReplay = z.object({
  seed: z.string().min(1).max(80),
  structures: pair(structures),
  stances: pair(stances).optional(),
})

const matchStats = z.object({
  rounds: amount,
  draws: amount,
  winners: z.array(team.nullable()).readonly().default([]),
  teams: pair(teamStats),
  heroes: z.array(heroStats).readonly(),
  /** Kept since match details could show every round. */
  lineups: z
    .array(pair(z.array(roundPick).readonly()))
    .readonly()
    .default([]),
  replays: z.array(roundReplay).max(40).readonly().default([]),
})

const remoteLink = z.object({
  seed: z.string().min(1),
  side: team,
})

const matchState = z.object({
  mode,
  trialId: z.enum(TRIAL_IDS).optional(),
  round: z.int().positive(),
  phase: z.enum(['planning', 'battle', 'summary', 'finished']),
  rng: z.object({
    i: z.number(),
    j: z.number(),
    S: z.array(z.number()),
  }),
  pool: z.record(heroId, z.int().nonnegative()),
  structures: pair(structures),
  players: pair(player),
  summary: scoredSummary.nullable(),
  result: z
    .object({
      winner: team.nullable(),
      reason: z.enum(MATCH_END_REASONS),
    })
    .nullable(),
  battle: z
    .object({
      mode,
      round: z.int().positive(),
      seed: z.string(),
      lineups: pair(lineup),
      structures: pair(structures),
      stances: pair(stances).optional(),
    })
    .nullable(),
  stats: matchStats.default(emptyMatchStats),
  link: remoteLink.optional(),
  opponentReady: z.boolean().optional(),
})

const envelope = z.object({
  version: z.literal(SNAPSHOT_VERSION),
  savedAt: z.number(),
  state: matchState,
})

/* Before game modes, coach levels went from 2 to 5 in the only mode there was; now every mode starts at 1. */
const legacyEnvelope = z
  .object({
    version: z.literal(1),
    savedAt: z.number(),
    state: matchState,
  })
  .transform((saved) => ({
    ...saved,
    state: {
      ...saved.state,
      players: saved.state.players.map((p) => ({
        ...p,
        level: Math.max(1, p.level - 1),
      })) as unknown as typeof saved.state.players,
    },
  }))

export function serializeSnapshot(state: MatchState) {
  return JSON.stringify({
    version: SNAPSHOT_VERSION,
    savedAt: Date.now(),
    state,
  })
}

/** Far above anything a real match reaches; only there to reject nonsense. */
const REMOTE_GOLD_LIMIT = 10_000
const REMOTE_UID_LENGTH = 64

/**
 * The board another player sent for a duel. It comes from someone else's device, so on top of the save
 * format it must be a board the rules allow: nobody in a lane the mode does not have, no more heroes on
 * the map than the level lets, no oversized bench, shop or stash, and every hero id unique.
 */
export function parseRemoteBoard(json: unknown, mode: ModeId) {
  const parsed = player.safeParse(json)
  if (!parsed.success) {
    return null
  }

  const board = parsed.data
  const { lanes, bench } = board.roster
  const onLanes = LANE_IDS.flatMap((lane) => lanes[lane])
  const heroes = [...bench, ...onLanes]
  const open = MODES[mode].lanes

  const allowed =
    LANE_IDS.every((lane) => open.includes(lane) || lanes[lane].length === 0) &&
    board.level <= MODES[mode].levels.length &&
    onLanes.length <= levelRules(mode, board.level).board &&
    bench.length <= ROSTER.benchSize &&
    board.shop.length <= ROSTER.shopSize &&
    board.stash.length <= STASH_SIZE &&
    board.gold <= REMOTE_GOLD_LIMIT &&
    heroes.every((hero) => hero.uid.length <= REMOTE_UID_LENGTH) &&
    new Set(heroes.map((hero) => hero.uid)).size === heroes.length

  return allowed ? board : null
}

/** Returns null for anything that is not a save this version of the game can load. */
export function parseSnapshot(raw: string) {
  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch {
    return null
  }

  const parsed = envelope.or(legacyEnvelope).safeParse(json)
  return parsed.success ? parsed.data.state : null
}
