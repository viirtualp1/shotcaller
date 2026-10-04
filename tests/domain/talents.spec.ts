import { describe, expect, it } from 'vitest'
import { parseRemoteBoard } from '@/application/persistence/snapshot'
import { ABILITY_PARAMS } from '@/content/abilities'
import { BALANCE_FINGERPRINT } from '@/content/balance'
import { HEROES } from '@/content/heroes'
import { ABILITY_IDS } from '@/content/ids'
import { activeTalents, TALENTS, tunedParams } from '@/content/talents'
import { sequentialIds } from '@/core/ids'
import { createRng } from '@/core/random/rng'
import { GreedyCoach } from '@/domain/coach/GreedyCoach'
import { HeroPool } from '@/domain/economy/HeroPool'
import { picksOf } from '@/domain/match/matchStats'
import { freshStructures } from '@/domain/match/structures'
import { Player } from '@/domain/player/Player'
import type { MatchRecord } from '@/domain/profile/Profile'
import { replaySetup } from '@/domain/replay/setup'
import { ABILITIES } from '@/simulation/abilities/registry'
import { arena } from '../helpers/battle'

function player() {
  const result = new Player(0, {
    pool: new HeroPool(),
    rng: createRng('talents'),
    ids: sequentialIds('talents'),
    mode: 'threeLanes',
    unlimitedGold: true,
  })

  return result
}

describe('talents', () => {
  it('give every ability two talents that change something it has', () => {
    for (const id of ABILITY_IDS) {
      for (const talent of TALENTS[id]) {
        const keys = Object.keys(talent.params)
        expect(keys.length + (talent.manaCost ? 1 : 0), `${id} ${talent.name}`).toBeGreaterThan(0)

        for (const key of keys) {
          expect(ABILITY_PARAMS[id], `${id}.${key}`).toHaveProperty(key)
        }
      }
    }
  })

  it('come into play with the second star and both at the third', () => {
    expect(activeTalents(1, 0)).toEqual([])
    expect(activeTalents(2)).toEqual([])
    expect(activeTalents(2, 1)).toEqual([1])
    expect(activeTalents(3)).toEqual([0, 1])

    expect(tunedParams('volley', [0, 1])).toMatchObject({
      ...TALENTS.volley[0].params,
      ...TALENTS.volley[1].params,
    })
  })

  it('are picked once, and only at two stars', () => {
    const coach = player()
    const archer = coach.recruit('archer')._unsafeUnwrap().hero
    expect(coach.chooseTalent(archer.uid, 0)._unsafeUnwrapErr().code).toBe('talentUnavailable')

    coach.recruit('archer')
    const { promoted } = coach.recruit('archer')._unsafeUnwrap()
    const hero = promoted[0]!
    expect(hero.stars).toBe(2)
    expect(coach.chooseTalent(hero.uid, 1).isOk()).toBe(true)
    expect(hero.talent).toBe(1)
    expect(coach.chooseTalent(hero.uid, 0)._unsafeUnwrapErr().code).toBe('talentUnavailable')
  })

  it('change the ability in battle', () => {
    const volleys = (stars: 1 | 2 | 3, talent?: 0 | 1) => {
      const { ctx, hero, simulation } = arena({
        ours: {
          mid: [
            {
              uid: 'archer',
              heroId: 'archer',
            },
          ],
        },
      })

      const archer = hero('archer')
      archer.hero.stars = stars
      archer.caster.talents = activeTalents(stars, talent)

      for (let i = 0; i < 6; i++) {
        const creep = ctx.factory.creep({
          team: 1,
          lane: 'mid',
          variant: 'melee',
          along: 0,
          strength: 1,
          damageBonus: 0,
          mega: false,
        })

        Object.assign(creep.position, {
          x: archer.position.x + 40 + i * 4,
          y: archer.position.y,
        })
      }

      ctx.index.sync()
      ABILITIES.volley.cast(archer, ctx)

      return simulation.world.with('projectile').entities.map((e) => e.projectile.damage)
    }

    expect(volleys(1)).toHaveLength(ABILITY_PARAMS.volley.arrows)
    expect(volleys(2, 0)).toHaveLength(TALENTS.volley[0].params.arrows!)
    expect(volleys(2, 1)[0]).toBe(TALENTS.volley[1].params.damage)
    expect(volleys(3, 0)).toHaveLength(TALENTS.volley[0].params.arrows!)
  })

  it('make Quick Study cheaper to cast', () => {
    const { hero } = arena({
      ours: {
        mid: [
          {
            uid: 'mimic',
            heroId: 'changeling',
          },
        ],
      },
    })

    const plain = hero('mimic').mana.max

    const { hero: studied } = arena({
      ours: {
        mid: [
          {
            uid: 'mimic',
            heroId: 'changeling',
            stars: 2,
            talent: 1,
          },
        ],
      },
    })

    expect(studied('mimic').mana.max).toBeCloseTo(plain * TALENTS.mimic[1].manaCost!)
    expect(HEROES.changeling.stats.mana).toBe(plain)
  })

  it('are kept for replays together with souls', () => {
    const lineup = {
      top: [
        {
          uid: 'a',
          heroId: 'archer' as const,
          stars: 2 as const,
          items: ['soulJar' as const],
          souls: 3,
          talent: 1 as const,
        },
      ],
      mid: [],
      bot: [],
    }

    const picks = picksOf(lineup)
    expect(picks[0]).toEqual([
      'archer',
      2,
      'top',
      ['soulJar'],
      {
        souls: 3,
        talent: 1,
      },
    ])

    const record = {
      balance: BALANCE_FINGERPRINT,
      side: 0,
      mode: 'threeLanes',
      roundLineups: [[picks, []]],
      replays: [
        {
          seed: 'talent-replay',
          structures: [freshStructures(), freshStructures()],
        },
      ],
    } as unknown as MatchRecord

    const setup = replaySetup(record, 1)
    expect(setup?.setup.lineups[0].top[0]).toMatchObject({
      souls: 3,
      talent: 1,
    })
  })

  it('cannot come with a one-star hero on a duel board', () => {
    const board = player().snapshot()

    const hero = {
      uid: 'x',
      heroId: 'archer' as const,
      stars: 1 as const,
      items: [],
      talent: 0 as const,
    }

    expect(
      parseRemoteBoard(
        {
          ...board,
          roster: {
            ...board.roster,
            bench: [hero],
          },
        },
        'threeLanes',
      ),
    ).toBeNull()

    expect(
      parseRemoteBoard(
        {
          ...board,
          roster: {
            ...board.roster,
            bench: [
              {
                ...hero,
                stars: 2,
              },
            ],
          },
        },
        'threeLanes',
      ),
    ).not.toBeNull()
  })

  it('are picked by the computer coach for its new two-star heroes', () => {
    const coach = player()
    for (let i = 0; i < 3; i++) {
      coach.recruit('spearman')
    }

    new GreedyCoach().playTurn(coach, {
      round: 5,
      rng: createRng('coach-talents'),
    })

    const hero = coach.roster.all().find((h) => h.heroId === 'spearman')!
    expect(hero.stars).toBe(2)
    expect(hero.talent).toBeDefined()
  })
})
