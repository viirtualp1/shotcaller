import { parseArgs } from 'node:util'
import { HEROES } from '@/content/heroes'
import {
  HERO_IDS,
  ITEM_IDS,
  LANE_IDS,
  ROLE_IDS,
  type HeroId,
  type ItemId,
  type LaneId,
  type RoleId,
  type StarLevel,
} from '@/content/ids'
import { ITEMS } from '@/content/items'
import { STRUCTURES } from '@/content/units'
import { createRng, type Rng } from '@/core/random/rng'
import type { BattleSetup, StructureState } from '@/domain/battle/contracts'
import { judgeRound, totalStructureDamage } from '@/domain/match/judge'
import { freshStructures } from '@/domain/match/structures'
import type { Lineup, OwnedHero } from '@/domain/roster/Roster'
import { headlessResolver } from '@/simulation/BattleSimulation'

/**
 * A/B test of items: the same random setups, with one hero of ours carrying each item in turn. Towers start
 * somewhat damaged, as they are in the middle of a match, so items that react to buildings get their chance.
 * Soulbond goes on the carrier and a lane-mate; the Soul Jar is tried empty and with five souls.
 */
const { values } = parseArgs({
  options: {
    setups: {
      type: 'string',
      default: '150',
    },
    seed: {
      type: 'string',
      default: 'items',
    },
    round: {
      type: 'string',
      default: '6',
    },
  },
})

const setupCount = Number(values.setups)
const round = Number(values.round)

interface Variant {
  readonly name: string
  readonly cost: number
  readonly items: readonly ItemId[]
  readonly mateItems?: readonly ItemId[]
  readonly souls?: number
}

const VARIANTS: readonly Variant[] = [
  {
    name: 'none',
    cost: 0,
    items: [],
  },
  ...ITEM_IDS.filter((id) => id !== 'soulbond').map((id) => ({
    name: id,
    cost: ITEMS[id].cost,
    items: [id],
  })),
  {
    name: 'soulJar+5',
    cost: ITEMS.soulJar.cost,
    items: ['soulJar'],
    souls: 5,
  },
  {
    name: 'soulbond×2',
    cost: ITEMS.soulbond.cost * 2,
    items: ['soulbond'],
    mateItems: ['soulbond'],
  },
]

interface Tally {
  wins: number
  draws: number
  margin: number
  byRole: Map<RoleId, { margin: number; count: number }>
}

let uid = 0

const owned = (heroId: HeroId, stars: StarLevel, items: readonly ItemId[] = [], souls = 0): OwnedHero => ({
  uid: `h${uid++}`,
  heroId,
  stars,
  items: [...items],
  ...(souls ? { souls } : {}),
})

const pick = <T>(rng: Rng, list: readonly T[]) => list[Math.floor(rng.next() * list.length)]!
const starsFor = (rng: Rng): StarLevel => (rng.next() < 0.35 ? 2 : 1)

function randomLineup(rng: Rng, size: number) {
  const lanes: Record<LaneId, { heroId: HeroId; stars: StarLevel }[]> = {
    top: [],
    mid: [],
    bot: [],
  }

  for (let i = 0; i < size; i++) {
    lanes[LANE_IDS[i % LANE_IDS.length]!].push({
      heroId: pick(rng, HERO_IDS),
      stars: starsFor(rng),
    })
  }

  return lanes
}

function wornStructures(rng: Rng): StructureState {
  const fresh = freshStructures()

  return {
    ...fresh,
    top: Math.round(STRUCTURES.tower.hp * (0.45 + rng.next() * 0.55)),
    mid: Math.round(STRUCTURES.tower.hp * (0.45 + rng.next() * 0.55)),
    bot: Math.round(STRUCTURES.tower.hp * (0.45 + rng.next() * 0.55)),
  }
}

const tallies = new Map<string, Tally>(
  VARIANTS.map((v) => [
    v.name,
    {
      wins: 0,
      draws: 0,
      margin: 0,
      byRole: new Map(),
    },
  ]),
)

const started = performance.now()

for (let i = 0; i < setupCount; i++) {
  const rng = createRng(`${values.seed}-${i}`)
  const lane = LANE_IDS[i % LANE_IDS.length]!
  const carrier = pick(rng, HERO_IDS)
  const stars = starsFor(rng)
  const ours = randomLineup(rng, 5)
  const theirs = randomLineup(rng, 6)
  const structures: [StructureState, StructureState] = [wornStructures(rng), wornStructures(rng)]
  const role = HEROES[carrier].role

  for (const variant of VARIANTS) {
    const build = (side: typeof ours, isOurs: boolean): Lineup => {
      const lanes = Object.fromEntries(
        LANE_IDS.map((l) => [
          l,
          side[l].map((h, slot) =>
            owned(h.heroId, h.stars, isOurs && l === lane && slot === 0 ? (variant.mateItems ?? []) : []),
          ),
        ]),
      ) as Record<LaneId, OwnedHero[]>

      if (isOurs) {
        lanes[lane].unshift(owned(carrier, stars, variant.items, variant.souls))
      }

      return lanes
    }

    const setup: BattleSetup = {
      mode: 'threeLanes',
      round,
      seed: `${values.seed}-battle-${i}`,
      lineups: [build(ours, true), build(theirs, false)],
      structures,
    }

    const outcome = headlessResolver.resolve(setup)
    const winner = judgeRound(outcome, 'threeLanes')
    const margin = totalStructureDamage(outcome.stats[0]) - totalStructureDamage(outcome.stats[1])
    const tally = tallies.get(variant.name)!
    tally.wins += winner === 0 ? 1 : 0
    tally.draws += winner === null ? 1 : 0
    tally.margin += margin

    const perRole = tally.byRole.get(role) ?? {
      margin: 0,
      count: 0,
    }

    perRole.margin += margin
    perRole.count++
    tally.byRole.set(role, perRole)
  }
}

const percent = (count: number) => `${Math.round((count / setupCount) * 100)}%`.padStart(4)
const baseline = tallies.get('none')!
const baseMargin = baseline.margin / setupCount

console.log(
  `items: ${setupCount} setups, round ${round}, ${((performance.now() - started) / 1000).toFixed(0)}s; ` +
    `margin is our building damage minus theirs; "gain" is over carrying nothing`,
)

console.log(
  `\n${'loadout'.padEnd(13)} cost   win  draw  margin   gain  gain/gold  ${ROLE_IDS.map((r) => r.slice(0, 7).padStart(8)).join('')}`,
)

for (const variant of [...VARIANTS].sort(
  (a, b) => tallies.get(b.name)!.margin - tallies.get(a.name)!.margin,
)) {
  const t = tallies.get(variant.name)!
  const margin = t.margin / setupCount
  const gain = margin - baseMargin

  const roles = ROLE_IDS.map((r) => {
    const own = t.byRole.get(r)
    const base = baseline.byRole.get(r)
    return own && base ? Math.round(own.margin / own.count - base.margin / base.count) : 0
  })

  console.log(
    `${variant.name.padEnd(13)} ${String(variant.cost).padStart(4)}  ${percent(t.wins)}  ${percent(t.draws)}` +
      `  ${String(Math.round(margin)).padStart(6)}  ${String(Math.round(gain)).padStart(5)}` +
      `  ${(variant.cost ? (gain / variant.cost).toFixed(0) : '-').padStart(9)}  ` +
      roles.map((g) => String(g).padStart(8)).join(''),
  )
}
