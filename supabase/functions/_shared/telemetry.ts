import { z } from 'zod'

export type Telemetry = z.infer<typeof telemetrySchema>

/** Version 2 discloses the US region; an earlier EU explanation cannot grant this policy. */
export const TELEMETRY_POLICY_VERSION = 2

// The ingestion boundary validates game ids too; free text is never accepted as a hero or item.
const heroId = z.enum([
  'spearman',
  'archer',
  'acolyte',
  'sapper',
  'shaman',
  'rogue',
  'shade',
  'pyromancer',
  'warden',
  'blademaster',
  'packLeader',
  'necromancer',
  'frostWitch',
  'giant',
  'engineer',
  'butcher',
  'sniper',
  'oracle',
  'herald',
  'stonewright',
  'changeling',
])

const shopItemIds = [
  'broadsword',
  'gloves',
  'chainmail',
  'vitality',
  'boots',
  'staff',
  'chalice',
  'manaStone',
  'vampireFang',
  'thornMail',
  'aegis',
  'soulJar',
  'soulbond',
  'echoShard',
  'townPortal',
  'cursedBlade',
] as const

/** Two copies of an item merge into its upgrade, named with a trailing plus. */
const itemId = z.enum([
  ...shopItemIds,
  ...shopItemIds.map((id) => `${id}+` as const),
  'tempestBlade',
  'bastionPlate',
  'echoStaff',
  'bloodEdge',
  'thornHeart',
  'phoenixChalice',
  'soulReaper',
  'wayfarerBond',
])

const synergyId = z.enum(['guardian', 'setup', 'soloMid', 'trilane', 'siege', 'hunt', 'arcane', 'bulwark'])

const factionIds = ['legion', 'wildkin', 'arcanum', 'grave', 'hearth'] as const

/** A faction step reached on some lane: two heroes of it there, or three. */
const factionStep = z.enum(factionIds.flatMap((id) => [`${id}:2`, `${id}:3`] as const))
const count = z.int().nonnegative().max(1_000_000)
const amount = z.number().nonnegative().max(1_000_000_000)

const pick = z.object({
  heroId,
  stars: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  lane: z.enum(['top', 'mid', 'bot']),
  items: z.array(itemId).max(2),
})

/** Parsing rebuilds every object and drops extra keys at every level. */
export const telemetrySchema = z.object({
  schema: z.literal(1),
  mode: z.enum(['threeLanes', 'twoLanes', 'oneLane']),
  kind: z.enum(['ai', 'duel', 'ghost', 'trial']),
  difficulty: z.enum(['relaxed', 'standard', 'hard']),
  balance: z.string().regex(/^[a-f0-9]{0,32}$/),
  verdict: z.enum(['win', 'loss', 'draw']),
  reason: z.enum(['throne', 'roundLimit', 'forfeit']),
  rounds: count.max(40),
  ratingBand: count,
  goldEarned: amount,
  towersDestroyed: count.max(5),
  lineup: z.array(pick).max(30),
  synergies: z.array(synergyId).max(8),
  /* Missing in events from clients before factions. */
  factions: z.array(factionStep).max(10).default([]),
  heroes: z
    .array(
      z.object({
        heroId,
        stars: count.min(1).max(3),
        rounds: count.max(40),
        kills: count,
        deaths: count,
        damage: amount,
        healing: amount,
        structureDamage: amount,
      }),
    )
    .max(18),
  roundBoards: z
    .array(
      z.object({
        verdict: z.enum(['win', 'loss', 'draw']),
        lineup: z.array(pick).max(30),
        synergies: z.array(synergyId).max(8),
        factions: z.array(factionStep).max(10).default([]),
      }),
    )
    .max(40),
})

export const telemetryRequestSchema = z.object({
  policyVersion: z.literal(TELEMETRY_POLICY_VERSION),
  matchId: z.uuid(),
  finishedAt: z.iso.datetime({ offset: true }),
  payload: telemetrySchema,
})
