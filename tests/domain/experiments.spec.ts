import { describe, expect, it } from 'vitest'
import { createMatch, restoreMatch } from '@/application/createMatch'
import { parseSnapshot, serializeSnapshot } from '@/application/persistence/snapshot'
import { ROTATION_PER_TIER, TWISTS } from '@/content/experiments'
import { HEROES } from '@/content/heroes'
import { CREEPS } from '@/content/units'
import { sequentialIds } from '@/core/ids'
import { freshStructures } from '@/domain/match/structures'
import { BattleSimulation, headlessResolver } from '@/simulation/BattleSimulation'
import type { SimulationContext } from '@/simulation/SimulationContext'

const rules = {
  rotation: true,
  twists: true,
}

function experimental(seed = 'experiments') {
  return createMatch({
    seed,
    ids: sequentialIds(seed),
    rules,
  })
}

describe('hero rotation', () => {
  it('keeps the same number of heroes of every tier, and only those reach the shop', () => {
    const match = experimental()
    const roster = match.rotation!

    expect(roster).toHaveLength(ROTATION_PER_TIER * 3)

    for (const tier of [1, 2, 3] as const) {
      expect(roster.filter((id) => HEROES[id].tier === tier)).toHaveLength(ROTATION_PER_TIER)
    }

    match.human.wallet.earn(500)

    for (let i = 0; i < 60; i++) {
      for (const offer of match.human.shop.slots) {
        if (offer) {
          expect(roster).toContain(offer)
        }
      }

      match.human.reroll()
    }
  })

  it('differs between matches and survives a reload', () => {
    const first = experimental('one').rotation
    const second = experimental('two').rotation
    expect(first).not.toEqual(second)

    const match = experimental('reload')
    const state = parseSnapshot(serializeSnapshot(match.snapshot()))!
    const restored = restoreMatch(state)

    expect(restored.rotation).toEqual(match.rotation)
    expect(restored.rules).toEqual(rules)
  })
})

describe('round twists', () => {
  it('give every round a twist, never the same twice in a row, and fight it', () => {
    const match = experimental()
    let previous = null

    let rounds = 0
    for (; rounds < 6; rounds++) {
      const twist = match.twist
      expect(twist).not.toBeNull()
      expect(twist).not.toBe(previous)
      previous = twist

      const setup = match.startBattle({ allowEmptyBoard: true })._unsafeUnwrap()
      expect(setup.twist).toBe(twist)
      match.finishBattle(headlessResolver.resolve(setup))
      expect(match.stats.replays.at(-1)?.twist).toBe(twist)

      /* An empty board loses its throne within a few rounds. */
      if (match.phase === 'finished') {
        break
      }

      match.nextRound()
    }

    expect(rounds).toBeGreaterThanOrEqual(2)
  })

  it('stay out of duels, trials and the training ground', () => {
    const duel = createMatch({
      rules,
      link: {
        seed: 'duel',
        side: 0,
      },
    })

    const trial = createMatch({
      rules,
      trialId: 'siege',
    })

    const training = createMatch({
      rules,
      sandbox: {
        dummies: 0,
        creeps: false,
        endless: false,
      },
    })

    for (const match of [duel, trial, training]) {
      expect(match.twist).toBeNull()
      expect(match.rotation).toBeNull()
    }
  })

  it('change the fight for both sides', () => {
    const fight = (twist?: keyof typeof TWISTS) =>
      new BattleSimulation({
        mode: 'threeLanes',
        round: 1,
        seed: 'twist',
        lineups: [
          {
            top: [
              {
                uid: 'a',
                heroId: 'archer',
                stars: 1,
                items: [],
              },
            ],
            mid: [],
            bot: [],
          },
          {
            top: [
              {
                uid: 'b',
                heroId: 'spearman',
                stars: 1,
                items: [],
              },
            ],
            mid: [],
            bot: [],
          },
        ],
        structures: [freshStructures(), freshStructures()],
        ...(twist ? { twist } : {}),
      })

    const hero = (simulation: BattleSimulation, uid: string) =>
      simulation.queries.heroes.entities.find((h) => h.hero.uid === uid)!

    const plain = fight()
    const moon = fight('bloodMoon')
    expect(hero(moon, 'b').attack.damage).toBeCloseTo(
      hero(plain, 'b').attack.damage * TWISTS.bloodMoon.heroes!.damage!,
    )

    const fog = fight('fog')
    expect(hero(fog, 'a').attack.range).toBeCloseTo(hero(plain, 'a').attack.range * TWISTS.fog.rangedReach!)
    expect(hero(fog, 'b').attack.range).toBe(0)

    const walls = fight('stoneWalls')
    for (const structure of walls.queries.structures) {
      expect(structure.damageTaken).toBe(TWISTS.stoneWalls.structureDamageTaken)
    }

    const tide = fight('siegeTide')
    const { ctx } = tide as unknown as { ctx: SimulationContext }

    const creep = ctx.factory.creep({
      team: 0,
      lane: 'top',
      variant: 'melee',
      along: 0,
      strength: 1,
      damageBonus: 0,
      mega: false,
    })

    expect(creep.structureDamage).toBeCloseTo(CREEPS.melee.structureDamage * TWISTS.siegeTide.creepSiege!)
  })
})
