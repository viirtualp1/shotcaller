import { z } from 'zod'
import { HERO_IDS, ITEM_IDS } from '@/content/ids'
import { ITEM_SLOTS, STASH_SIZE } from '@/content/items'
import { ROSTER } from '@/content/rules'
import type { MatchState } from '@/domain/match/Match'
import { emptyMatchStats } from '@/domain/match/matchStats'
import { emptyLedger } from '@/domain/player/ledger'

const SNAPSHOT_VERSION = 1

const team = z.union([z.literal(0), z.literal(1)])
const pair = <T extends z.ZodType>(schema: T) => z.tuple([schema, schema]).readonly()
const heroId = z.enum(HERO_IDS)
const itemId = z.enum(ITEM_IDS)
const stars = z.union([z.literal(1), z.literal(2), z.literal(3)])
const level = z.union([z.literal(2), z.literal(3), z.literal(4), z.literal(5)])
const amount = z.number().finite().nonnegative()

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

const structures = z.object({
  top: amount,
  mid: amount,
  bot: amount,
  throne: amount,
})

const player = z.object({
  gold: amount,
  level,
  xp: amount,
  streak: z.number().int(),
  roster: z.object({
    bench: z.array(ownedHero),
    lanes: lineup,
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
  damageDealt: amount,
  damageReceived: amount.default(0),
  structureDamage: amount.default(0),
  healing: amount.default(0),
  lastHits: amount.default(0),
  kills: amount,
  deaths: amount,
})

const summary = z.object({
  round: z.number().int().positive(),
  winner: team.nullable(),
  structureDamage: pair(amount),
  laneDamage: z.object({
    top: pair(amount),
    mid: pair(amount),
    bot: pair(amount),
    throne: pair(amount),
  }),
  heroKills: pair(amount),
  income: pair(income),
  mvp: heroReport.nullable(),
  heroes: z.array(heroReport).default([]),
})

const teamStats = z.object({
  roundsWon: amount,
  heroKills: amount,
  creepKills: amount,
  structureDamage: structures,
  income: income,
})

const heroStats = z.object({
  team,
  heroId,
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

const matchStats = z.object({
  rounds: amount,
  draws: amount,
  winners: z.array(team.nullable()).readonly().default([]),
  teams: pair(teamStats),
  heroes: z.array(heroStats).readonly(),
})

const remoteLink = z.object({
  seed: z.string().min(1),
  side: team,
})

const matchState = z.object({
  round: z.number().int().positive(),
  phase: z.enum(['planning', 'battle', 'summary', 'finished']),
  rng: z.object({
    i: z.number(),
    j: z.number(),
    S: z.array(z.number()),
  }),
  pool: z.record(heroId, z.number().int().nonnegative()),
  structures: pair(structures),
  players: pair(player),
  summary: summary.nullable(),
  result: z
    .object({
      winner: team.nullable(),
      reason: z.enum(['throne', 'roundLimit']),
    })
    .nullable(),
  battle: z
    .object({
      round: z.number().int().positive(),
      seed: z.string(),
      lineups: pair(lineup),
      structures: pair(structures),
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
 * format it must be a board the rules allow: no more heroes on the map than the level lets, no oversized
 * bench, shop or stash, and every hero id unique.
 */
export function parseRemoteBoard(json: unknown) {
  const parsed = player.safeParse(json)
  if (!parsed.success) {
    return null
  }

  const board = parsed.data
  const { lanes, bench } = board.roster
  const heroes = [...bench, ...lanes.top, ...lanes.mid, ...lanes.bot]
  const onMap = lanes.top.length + lanes.mid.length + lanes.bot.length

  const allowed =
    onMap <= board.level &&
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

  const parsed = envelope.safeParse(json)
  return parsed.success ? parsed.data.state : null
}
