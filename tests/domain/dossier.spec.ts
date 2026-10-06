import { describe, expect, it } from 'vitest'
import { coachDossierSchema } from '@/application/cloud/dossierSchema'
import {
  heroBuild,
  heroPool,
  lineupSteps,
  ratingTrail,
  signatureLineup,
  turningRound,
} from '@/domain/profile/dossier'
import { createProfile } from '@/domain/profile/Profile'
import { freshStructures } from '@/domain/match/structures'
import { play, duelMatch, WIN } from '../helpers/profile'

const { record } = play(createProfile('2026-10-06T10:00:00.000Z'), duelMatch(WIN))

const summary = {
  ...record,
  duel: true,
}

describe('coach scouting', () => {
  it('reads old profiles and skips hero records from unknown or malformed content', () => {
    const dossier = coachDossierSchema.parse({
      id: '72000000-0000-4000-8000-000000000002',
      name: 'Coach',
      avatar: null,
      photo: null,
      rating: 1000,
      ratings: null,
      totals: null,
      recent: [],
      heroes: {
        futureHero: { matches: 10 },
        giant: { matches: -1 },
      },
    })

    expect(dossier.heroes).toEqual({})
    expect(dossier.synergies).toEqual({})
    expect(dossier.ratings.threeLanes).toBe(1000)
    expect(heroPool(dossier.heroes)).toEqual([])
  })

  it('chooses an actual complete build instead of mixing items that were never worn together', () => {
    const matches = [
      {
        ...summary,
        lineup: [
          {
            heroId: 'giant' as const,
            stars: 2 as const,
            lane: 'mid' as const,
            items: ['broadsword' as const],
          },
        ],
      },
      {
        ...summary,
        lineup: [
          {
            heroId: 'giant' as const,
            stars: 2 as const,
            lane: 'mid' as const,
            items: ['chainmail' as const],
          },
        ],
      },
      {
        ...summary,
        lineup: [
          {
            heroId: 'giant' as const,
            stars: 2 as const,
            lane: 'mid' as const,
            items: ['broadsword' as const],
          },
        ],
      },
    ]

    const build = heroBuild(matches, 'giant')!
    expect(build.loadout).toEqual(['broadsword'])
    expect(build.items).toHaveLength(2)
    expect(build.lane).toBe('mid')
    expect(signatureLineup(matches)?.lanes.mid?.[0]?.heroId).toBe('giant')
    expect(heroBuild(matches, 'archer')).toBeNull()
  })

  it('keeps mode ratings in separate trails', () => {
    const matches = [
      {
        ...summary,
        mode: 'oneLane' as const,
        ratingBefore: 1200,
        ratingAfter: 1220,
      },
      {
        ...summary,
        mode: 'threeLanes' as const,
        ratingBefore: 600,
        ratingAfter: 580,
      },
      {
        ...summary,
        mode: 'oneLane' as const,
        ratingBefore: 1180,
        ratingAfter: 1200,
      },
    ]

    expect(ratingTrail(matches)).toEqual([1180, 1200, 1220])
    expect(ratingTrail(matches, 'threeLanes')).toEqual([600, 580])
  })

  it('marks purchases, upgrades, moves and equipment changes across rounds', () => {
    const steps = lineupSteps({
      ...record,
      roundLineups: [
        [[['giant', 1, 'mid', []]], []],
        [
          [
            ['giant', 2, 'top', ['broadsword']],
            ['archer', 1, 'mid', []],
          ],
          [],
        ],
      ],
    })

    expect(steps[1]?.heroes[0]).toMatchObject({
      heroId: 'giant',
      added: false,
      upgraded: true,
      moved: true,
      itemsChanged: true,
    })

    expect(steps[1]?.heroes[1]).toMatchObject({
      heroId: 'archer',
      added: true,
    })

    expect(steps[0]?.heroes[0]?.added).toBe(false)
  })

  it('uses recorded building damage and excludes the final round without an after-snapshot', () => {
    const full = [freshStructures('threeLanes'), freshStructures('threeLanes')] as const

    const damaged = {
      ...full[1],
      top: full[1].top - 100,
    }

    expect(
      turningRound({
        ...record,
        replays: [
          {
            seed: 'a',
            structures: full,
          },
          {
            seed: 'b',
            structures: [full[0], damaged],
          },
        ],
      }),
    ).toBe(1)

    expect(
      turningRound({
        ...record,
        replays: [],
      }),
    ).toBeNull()
  })
})
