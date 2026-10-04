import { parseArgs } from 'node:util'
import { HEROES } from '@/content/heroes'
import { HERO_IDS, LANE_IDS, type HeroId, type LaneId, type StarLevel } from '@/content/ids'
import { TALENTS, type TalentChoice } from '@/content/talents'
import { createRng, type Rng } from '@/core/random/rng'
import { judgeRound, totalStructureDamage } from '@/domain/match/judge'
import { freshStructures } from '@/domain/match/structures'
import type { OwnedHero } from '@/domain/roster/Roster'
import { headlessResolver } from '@/simulation/BattleSimulation'

/**
 * A/B test of talents: the same random setups with a two-star hero carrying no talent, then each of its two.
 * A pair is balanced when both beat no talent by about as much.
 */
const { values } = parseArgs({
  options: {
    setups: {
      type: 'string',
      default: '80',
    },
    tier: {
      type: 'string',
    },
    seed: {
      type: 'string',
      default: 'talents',
    },
    /** A comma-separated list of heroes to test instead of a whole tier. */
    heroes: {
      type: 'string',
    },
  },
})

const setupCount = Number(values.setups)
const only = values.heroes?.split(',')

const heroes = HERO_IDS.filter(
  (id) => (!values.tier || HEROES[id].tier === Number(values.tier)) && (!only || only.includes(id)),
)

let uid = 0

const owned = (heroId: HeroId, stars: StarLevel, talent?: TalentChoice): OwnedHero => ({
  uid: `h${uid++}`,
  heroId,
  stars,
  items: [],
  ...(talent !== undefined ? { talent } : {}),
})

const pick = <T>(rng: Rng, list: readonly T[]) => list[Math.floor(rng.next() * list.length)]!

function randomLineup(rng: Rng, size: number) {
  const lanes: Record<LaneId, HeroId[]> = {
    top: [],
    mid: [],
    bot: [],
  }

  for (let i = 0; i < size; i++) {
    lanes[LANE_IDS[i % LANE_IDS.length]!].push(pick(rng, HERO_IDS))
  }

  return lanes
}

const build = (ids: Record<LaneId, HeroId[]>): Record<LaneId, OwnedHero[]> => ({
  top: ids.top.map((id) => owned(id, 2, 0)),
  mid: ids.mid.map((id) => owned(id, 2, 0)),
  bot: ids.bot.map((id) => owned(id, 2, 0)),
})

console.log(`talents: ${setupCount} setups per hero at ★★; margin is our building damage minus theirs`)
console.log(`${'hero'.padEnd(13)} ${'none'.padStart(6)}  ${'talent A'.padEnd(22)} ${'talent B'.padEnd(22)}`)

for (const heroId of heroes) {
  const margins = [0, 0, 0]
  const wins = [0, 0, 0]
  for (let i = 0; i < setupCount; i++) {
    const rng = createRng(`${values.seed}-${i}`)
    const lane = LANE_IDS[i % LANE_IDS.length]!
    const ours = randomLineup(rng, 4)

    const theirs = build(randomLineup(rng, 5))

    ;([undefined, 0, 1] as const).forEach((talent, variant) => {
      const lineup = build(ours)
      lineup[lane].unshift(owned(heroId, 2, talent))

      const outcome = headlessResolver.resolve({
        mode: 'threeLanes',
        round: 8,
        seed: `${values.seed}-battle-${i}`,
        lineups: [lineup, theirs],
        structures: [freshStructures(), freshStructures()],
      })

      margins[variant]! += totalStructureDamage(outcome.stats[0]) - totalStructureDamage(outcome.stats[1])
      wins[variant]! += judgeRound(outcome, 'threeLanes') === 0 ? 1 : 0
    })
  }

  const [none, a, b] = margins.map((m) => Math.round(m / setupCount)) as [number, number, number]

  const label = (talent: 0 | 1, margin: number) =>
    `${TALENTS[HEROES[heroId].ability][talent].name} ${margin - none >= 0 ? '+' : ''}${margin - none}`.padEnd(
      22,
    )

  console.log(`${heroId.padEnd(13)} ${String(none).padStart(6)}  ${label(0, a)} ${label(1, b)}`)
}
