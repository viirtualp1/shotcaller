import { z } from 'zod'
import { HERO_IDS, ITEM_IDS } from '@/content/ids'
import { ITEM_SLOTS } from '@/content/items'
import type { MatchState } from '@/domain/match/Match'

const SNAPSHOT_VERSION = 1

const team = z.union([z.literal(0), z.literal(1)])
const pair = <T extends z.ZodType>(schema: T) => z.tuple([schema, schema])
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
const lineup = z.object({ top: z.array(ownedHero), mid: z.array(ownedHero), bot: z.array(ownedHero) })
const structures = z.object({ top: amount, mid: amount, bot: amount, throne: amount })

const player = z.object({
  gold: amount,
  level,
  xp: amount,
  streak: z.number().int(),
  roster: z.object({ bench: z.array(ownedHero), lanes: lineup }),
  shop: z.array(heroId.nullable()),
  stash: z.array(itemId),
})

const income = z.object({ base: amount, interest: amount, farm: amount, win: amount, total: amount })
const heroReport = z.object({
  uid: z.string(),
  team,
  heroId,
  stars,
  damageDealt: amount,
  kills: amount,
  deaths: amount,
})

const summary = z.object({
  round: z.number().int().positive(),
  winner: team.nullable(),
  structureDamage: pair(amount),
  laneDamage: z.object({ top: pair(amount), mid: pair(amount), bot: pair(amount), throne: pair(amount) }),
  heroKills: pair(amount),
  income: pair(income),
  mvp: heroReport.nullable(),
  heroes: z.array(heroReport).default([]),
})

const matchState = z.object({
  round: z.number().int().positive(),
  phase: z.enum(['planning', 'battle', 'summary', 'finished']),
  rng: z.object({ i: z.number(), j: z.number(), S: z.array(z.number()) }),
  pool: z.record(heroId, z.number().int().nonnegative()),
  structures: pair(structures),
  players: pair(player),
  summary: summary.nullable(),
  result: z.object({ winner: team.nullable(), reason: z.enum(['throne', 'roundLimit']) }).nullable(),
  battle: z
    .object({
      round: z.number().int().positive(),
      seed: z.string(),
      lineups: pair(lineup),
      structures: pair(structures),
    })
    .nullable(),
})

const envelope = z.object({
  version: z.literal(SNAPSHOT_VERSION),
  savedAt: z.number(),
  state: matchState,
})

export function serializeSnapshot(state: MatchState): string {
  return JSON.stringify({ version: SNAPSHOT_VERSION, savedAt: Date.now(), state })
}

/** Returns null for anything that is not a save this version of the game can load. */
export function parseSnapshot(raw: string): MatchState | null {
  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch {
    return null
  }
  const parsed = envelope.safeParse(json)
  return parsed.success ? parsed.data.state : null
}
