import { describe, expect, it } from 'vitest'
import { BATTLE } from '@/content/rules'
import type { HeroId, LaneId } from '@/content/ids'
import type { BattleSetup } from '@/domain/battle/contracts'
import { freshStructures } from '@/domain/match/structures'
import type { Lineup } from '@/domain/roster/Roster'
import { distance } from '@/core/math/vec2'
import { BattleSimulation } from '@/simulation/BattleSimulation'
import { LaneMap } from '@/simulation/map/LaneMap'
import { keepOnDeck } from '@/simulation/map/deck'

const RADIUS = 12

const offDeck = (map: LaneMap, x: number, y: number, radius = RADIUS) => {
  const deck = map.definition.deck
  if (!deck) {
    return false
  }

  const lane = map.lanes[0]!
  const half = deck.width / 2 - radius
  const platform = deck.platform - radius
  const onLane = map.project(map.path(0, lane), { x, y }).distance > half + 1e-4
  const onPlatform = [0, 1].some((team) => distance({ x, y }, map.base(team as 0 | 1)) <= platform + 1e-4)

  return onLane && !onPlatform
}

describe('bridge deck', () => {
  const map = new LaneMap('oneLane')

  it('pulls a body shoved off the middle of the bridge back to the side', () => {
    const position = { x: 627, y: 627 }
    expect(offDeck(map, position.x, position.y)).toBe(true)

    keepOnDeck(map, position, RADIUS)

    expect(offDeck(map, position.x, position.y)).toBe(false)
    expect(map.project(map.path(0, 'mid'), position).distance).toBeCloseTo(map.definition.deck!.width / 2 - RADIUS, 4)
  })

  it('leaves a body standing on a base platform', () => {
    const base = map.base(0)
    const position = { x: base.x + 100, y: base.y }
    keepOnDeck(map, position, RADIUS)

    expect(position).toEqual({ x: base.x + 100, y: base.y })
  })

  it('does nothing on a map without a bridge', () => {
    const lanes = new LaneMap('threeLanes')
    const position = { x: 10, y: 10 }
    keepOnDeck(lanes, position, RADIUS)

    expect(position).toEqual({ x: 10, y: 10 })
  })
})

describe('one-lane battle', () => {
  it('keeps heroes and creeps on the deck while they are shoved together', () => {
    const heroes = ['butcher', 'giant', 'shade', 'blademaster', 'acolyte'] as HeroId[]
    const sim = new BattleSimulation(oneLaneSetup(heroes))
    const deck = sim.map.definition.deck!

    const hero = sim.queries.heroes.entities[0]!
    hero.position.x = 627
    hero.position.y = 627
    sim.step()

    expect(offDeck(sim.map, hero.position.x, hero.position.y)).toBe(false)

    for (let i = 0; i < 12 / BATTLE.step; i++) {
      sim.step()
    }

    const outside = sim.queries.units.entities.filter(
      (unit) => unit.kind !== 'structure' && offDeck(sim.map, unit.position.x, unit.position.y, unit.radius),
    )

    expect(outside).toEqual([])
    expect(deck.width).toBe(124)
  })
})

function oneLaneSetup(heroes: HeroId[]): BattleSetup {
  const side = (prefix: string): Lineup => {
    const build = (lane: LaneId) =>
      (lane === 'mid' ? heroes : []).map((heroId, i) => ({
        uid: `${prefix}-${i}`,
        heroId,
        stars: 1 as const,
        items: [],
      }))

    return { top: build('top'), mid: build('mid'), bot: build('bot') }
  }

  return {
    mode: 'oneLane',
    round: 5,
    seed: 'deck',
    lineups: [side('a'), side('b')],
    structures: [freshStructures('oneLane'), freshStructures('oneLane')],
  }
}
