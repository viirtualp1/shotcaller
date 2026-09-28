import { parseArgs } from 'node:util'
import { HEROES } from '@/content/heroes'
import { HERO_IDS, LANE_IDS, type HeroId, type LaneId, type StarLevel } from '@/content/ids'
import { createRng, type Rng } from '@/core/random/rng'
import type { BattleSetup } from '@/domain/battle/contracts'
import { judgeRound, totalStructureDamage } from '@/domain/match/judge'
import { freshStructures } from '@/domain/match/structures'
import type { Lineup, OwnedHero } from '@/domain/roster/Roster'
import { headlessResolver } from '@/simulation/BattleSimulation'

/**
 * A/B test within one tier: the same random setups, with each hero of the tier dropped into the same slot.
 * Differences in round wins and building damage then come from the hero, not from the draft.
 */
const { values } = parseArgs({
  options: {
    tier: {
      type: 'string',
      default: '3',
    },
    setups: {
      type: 'string',
      default: '150',
    },
    seed: {
      type: 'string',
      default: 'ab',
    },
  },
})

const tier = Number(values.tier)
const setupCount = Number(values.setups)
const candidates = HERO_IDS.filter((id) => HEROES[id].tier === tier)
const fillers = HERO_IDS.filter((id) => HEROES[id].tier !== tier)

interface Tally {
  wins: number
  draws: number
  margin: number
}

let uid = 0

const owned = (heroId: HeroId, stars: StarLevel): OwnedHero => ({
  uid: `h${uid++}`,
  heroId,
  stars,
  items: [],
})

const pick = <T>(rng: Rng, list: readonly T[]) => list[Math.floor(rng.next() * list.length)]!
const starsFor = (rng: Rng): StarLevel => (rng.next() < 0.35 ? 2 : 1)

function randomLineup(rng: Rng, size: number) {
  const lanes: Record<LaneId, OwnedHero[]> = {
    top: [],
    mid: [],
    bot: [],
  }

  for (let i = 0; i < size; i++) {
    lanes[LANE_IDS[i % LANE_IDS.length]!].push(owned(pick(rng, fillers), starsFor(rng)))
  }

  return lanes
}

const tallies = new Map<HeroId, Tally>()

for (let i = 0; i < setupCount; i++) {
  const rng = createRng(`${values.seed}-${i}`)
  const lane = LANE_IDS[i % LANE_IDS.length]!
  const stars = starsFor(rng)
  const ours = randomLineup(rng, 4)
  const theirs = randomLineup(rng, 5)

  for (const candidate of candidates) {
    const lineup: Lineup = {
      ...ours,
      [lane]: [owned(candidate, stars), ...ours[lane]],
    }

    const setup: BattleSetup = {
      mode: 'threeLanes',
      round: 6,
      seed: `${values.seed}-battle-${i}`,
      lineups: [lineup, theirs],
      structures: [freshStructures(), freshStructures()],
    }

    const outcome = headlessResolver.resolve(setup)
    const winner = judgeRound(outcome, 'threeLanes')

    const tally = tallies.get(candidate) ?? {
      wins: 0,
      draws: 0,
      margin: 0,
    }

    tally.wins += winner === 0 ? 1 : 0
    tally.draws += winner === null ? 1 : 0
    tally.margin += totalStructureDamage(outcome.stats[0]) - totalStructureDamage(outcome.stats[1])
    tallies.set(candidate, tally)
  }
}

const percent = (count: number) => `${Math.round((count / setupCount) * 100)}%`.padStart(4)
const rows = [...tallies].sort((a, b) => b[1].margin - a[1].margin)
const meanMargin = rows.reduce((sum, [, t]) => sum + t.margin, 0) / rows.length / setupCount

console.log(`tier ${tier}, ${setupCount} setups, mean building-damage margin ${Math.round(meanMargin)}`)

for (const [id, t] of rows) {
  const margin = t.margin / setupCount

  console.log(
    `${id.padEnd(14)} win ${percent(t.wins)}  draw ${percent(t.draws)}` +
      `  margin ${String(Math.round(margin)).padStart(5)}  vs mean ${String(Math.round(margin - meanMargin)).padStart(5)}`,
  )
}
