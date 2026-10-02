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
    sandbox: DEFAULT_SANDBOX,
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

  it('fights dummies round after round without wearing down the buildings or ending', () => {
    const match = training()
    match.human.recruit('pyromancer')
    match.human.move(match.human.roster.all()[0]!.uid, 'top')._unsafeUnwrap()

    expect(
      match
        .setSandbox({
          dummies: 9,
          creeps: true,
        })
        .isOk(),
    ).toBe(true)

    expect(match.sandbox).toEqual({
      dummies: SANDBOX.maxDummies,
      creeps: true,
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
  })
})
