import { describe, expect, it } from 'vitest'
import { createMatch } from '@/application/createMatch'
import { MODES } from '@/content/modes'
import { DEFAULT_SANDBOX, SANDBOX } from '@/content/sandbox'
import { sequentialIds } from '@/core/ids'
import { freshStructures } from '@/domain/match/structures'
import { headlessResolver } from '@/simulation/BattleSimulation'

const training = () =>
  createMatch({
    seed: 'training',
    ids: sequentialIds(),
    mode: 'twoLanes',
    sandbox: {
      ...DEFAULT_SANDBOX,
      endless: false,
    },
  })

describe('training ground match', () => {
  it('pays for anything and opens the whole board from the start', () => {
    const match = training()
    const { human } = match

    expect(human.level).toBe(MODES.twoLanes.levels.length)

    for (let i = 0; i < 3; i++) {
      expect(human.recruit('frostWitch').isOk()).toBe(true)
    }

    expect(human.buyItem('aegis').isOk()).toBe(true)

    expect(human.roster.all()).toEqual([
      expect.objectContaining({
        heroId: 'frostWitch',
        stars: 2,
      }),
    ])

    expect(human.wallet.gold).toBe(SANDBOX.gold)
  })

  it('keeps recruiting off the shop outside the training ground', () => {
    const match = createMatch({
      seed: 'real',
      ids: sequentialIds(),
    })

    expect(match.human.recruit('giant').isErr()).toBe(true)
  })

  it('exits untimed battles without advancing the round or recording a result', () => {
    const match = training()
    match.setSandbox(DEFAULT_SANDBOX)._unsafeUnwrap()
    match.human.recruit('pyromancer')._unsafeUnwrap()
    const hero = match.human.roster.all()[0]!
    match.human.move(hero.uid, 'top')._unsafeUnwrap()

    for (let attempt = 0; attempt < 3; attempt++) {
      match.startBattle()._unsafeUnwrap()
      match.exitSandboxBattle()._unsafeUnwrap()
      expect(match.phase).toBe('planning')
      expect(match.round).toBe(1)
      expect(match.pendingBattle).toBeNull()
      expect(match.snapshot().stats.rounds).toBe(0)
      expect(match.snapshot().stats.winners).toEqual([])
      expect(match.human.roster.all()).toEqual([hero])
      expect(match.structures).toEqual([freshStructures('twoLanes'), freshStructures('twoLanes')])
    }
  })

  it('allows the round-free exit only during an untimed training battle', () => {
    const match = training()
    expect(match.exitSandboxBattle().isErr()).toBe(true)
    match.human.recruit('pyromancer')._unsafeUnwrap()
    match.human.move(match.human.roster.all()[0]!.uid, 'top')._unsafeUnwrap()
    match.startBattle()._unsafeUnwrap()
    expect(match.exitSandboxBattle().isErr()).toBe(true)
  })

  it(
    'fights dummies round after round without wearing down the buildings or ending',
    { timeout: 15000 },
    () => {
      const match = training()
      match.human.recruit('pyromancer')
      match.human.move(match.human.roster.all()[0]!.uid, 'top')._unsafeUnwrap()

      expect(
        match
          .setSandbox({
            dummies: 9,
            creeps: true,
            endless: false,
          })
          .isOk(),
      ).toBe(true)

      expect(match.sandbox).toEqual({
        dummies: SANDBOX.maxDummies,
        creeps: true,
        endless: false,
      })

      /* One fought battle stands in for every round: the rule under test is what a training round leaves behind. */
      const fought = headlessResolver.resolve(match.startBattle()._unsafeUnwrap())
      expect(fought.heroes.find((hero) => hero.team === 0)?.damageDealt).toBeGreaterThan(0)
      match.finishBattle(fought)._unsafeUnwrap()
      match.nextRound()._unsafeUnwrap()

      for (let round = 2; round <= MODES.twoLanes.maxRounds + 2; round++) {
        const setup = match.startBattle()._unsafeUnwrap()
        expect(setup.sandbox).toEqual(match.sandbox)
        expect(setup.lineups[1].top).toEqual([])

        match.finishBattle(fought)._unsafeUnwrap()
        expect(match.phase).toBe('summary')
        expect(match.structures).toEqual([freshStructures('twoLanes'), freshStructures('twoLanes')])
        match.nextRound()._unsafeUnwrap()
      }

      expect(match.result).toBeNull()
    },
  )

  it('keeps live practice orders for the next battle and rejects absent lanes', () => {
    const match = training()
    match.human.recruit('archer')._unsafeUnwrap()
    match.human.move(match.human.roster.all()[0]!.uid, 'top')._unsafeUnwrap()
    expect(match.setSandboxGoal('top', 'push').isOk()).toBe(true)
    const setup = match.startBattle()._unsafeUnwrap()
    expect(setup.sandbox?.goals?.top).toBe('push')
    expect(match.setSandboxGoal('top', 'dummies').isOk()).toBe(true)
    expect(match.sandbox?.goals?.top).toBe('dummies')
    expect(match.setSandboxGoal('mid', 'push').isErr()).toBe(true)
  })
})
