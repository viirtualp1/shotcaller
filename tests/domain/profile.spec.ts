import { describe, expect, it } from 'vitest'
import { parseProfile, serializeProfile } from '@/application/persistence/profileSnapshot'
import type { HeroId } from '@/content/ids'
import { PROFILE } from '@/content/profile'
import type { Difficulty } from '@/content/rules'
import type { MatchResult } from '@/domain/match/judge'
import { emptyMatchStats, type HeroMatchStats, type MatchStats } from '@/domain/match/matchStats'
import {
  avatarOf,
  createProfile,
  recordMatch,
  type FinishedMatch,
  type Profile,
} from '@/domain/profile/Profile'
import { levelFor, rankFor, rankStep, ratingChange } from '@/domain/profile/progression'

const hero = (heroId: HeroId, damageDealt: number, kills = 0): HeroMatchStats => ({
  team: 0,
  heroId,
  bestStars: 1,
  rounds: 3,
  damageDealt,
  damageReceived: 0,
  structureDamage: 0,
  healing: 0,
  lastHits: 0,
  kills,
  deaths: 1,
})

function finished(result: MatchResult, difficulty: Difficulty = 'standard', rounds = 6): FinishedMatch {
  const empty = emptyMatchStats()

  const stats: MatchStats = {
    ...empty,
    rounds,
    teams: [
      {
        ...empty.teams[0],
        roundsWon: 4,
        heroKills: 5,
      },
      {
        ...empty.teams[1],
        roundsWon: 2,
      },
    ],
    heroes: [
      hero('acolyte', 300),
      hero('blademaster', 900, 4),
      {
        ...hero('giant', 500),
        team: 1,
      },
    ],
  }

  const owned = (heroId: HeroId) => ({
    uid: heroId,
    heroId,
    stars: 1 as const,
    items: [],
  })

  return {
    difficulty,
    result,
    stats,
    lineup: {
      top: [],
      mid: [owned('pyromancer')],
      bot: [owned('blademaster'), owned('acolyte')],
    },
    towersDestroyed: 2,
  }
}

const WIN: MatchResult = {
  winner: 0,
  reason: 'throne',
}

const LOSS: MatchResult = {
  winner: 1,
  reason: 'throne',
}

const DRAW: MatchResult = {
  winner: null,
  reason: 'roundLimit',
}

let seq = 0

const play = (profile: Profile, match: FinishedMatch) =>
  recordMatch(profile, match, {
    id: `m${++seq}`,
    playedAt: '2026-09-27T12:00:00.000Z',
  })

describe('coach ranks', () => {
  it('climbs five stars per medal and tops out without stars', () => {
    expect(rankFor(0)).toMatchObject({
      tier: 'rookie',
      stars: 1,
      next: 40,
    })

    expect(rankFor(199)).toMatchObject({
      tier: 'rookie',
      stars: 5,
    })

    expect(rankFor(200)).toMatchObject({
      tier: 'scout',
      stars: 1,
      floor: 200,
    })

    expect(rankFor(5000)).toMatchObject({
      tier: 'shotcaller',
      stars: 0,
      next: null,
    })

    expect(rankStep(rankFor(240))).toBeGreaterThan(rankStep(rankFor(239)))
  })

  it('pays more for a throne and less without the planning timer', () => {
    expect(ratingChange(WIN, 'standard')).toBe(30)

    expect(
      ratingChange(
        {
          ...WIN,
          reason: 'roundLimit',
        },
        'standard',
      ),
    ).toBe(25)

    expect(ratingChange(WIN, 'relaxed')).toBe(24)
    expect(ratingChange(LOSS, 'relaxed')).toBe(-20)
    expect(ratingChange(DRAW, 'standard')).toBe(0)
  })

  it('needs more XP for every next level', () => {
    expect(levelFor(0)).toEqual({
      level: 1,
      into: 0,
      needed: 200,
    })

    expect(levelFor(449)).toEqual({
      level: 2,
      into: 249,
      needed: 250,
    })
  })
})

describe('recordMatch', () => {
  it('remembers the match and updates lifetime stats', () => {
    const { profile, record } = play(createProfile('2026-09-27T10:00:00.000Z'), finished(WIN))

    expect(record).toMatchObject({
      verdict: 'win',
      rounds: 6,
      roundsWon: 4,
      roundsLost: 2,
      mvp: 'blademaster',
      ratingBefore: 0,
      ratingAfter: 30,
      towersDestroyed: 2,
    })

    expect(record.heroes.map((h) => h.heroId)).toEqual(['blademaster', 'acolyte'])
    expect([...record.synergies].sort()).toEqual(['guardian', 'soloMid'])

    expect(profile.totals).toMatchObject({
      matches: 1,
      wins: 1,
      throneWins: 1,
      heroKills: 5,
      streak: 1,
      fastestWin: 6,
    })

    expect(profile.heroes.blademaster).toMatchObject({
      matches: 1,
      wins: 1,
      kills: 4,
    })

    expect(profile.heroes.giant).toBeUndefined()

    expect(profile.synergies.guardian).toEqual({
      matches: 1,
      wins: 1,
    })

    expect(avatarOf(profile)).toBe('blademaster')
  })

  it('tracks streaks, keeps rating above zero and caps the history', () => {
    let profile = createProfile('2026-09-27T10:00:00.000Z')
    profile = play(profile, finished(LOSS)).profile
    expect(profile.rating).toBe(0)
    expect(profile.totals.streak).toBe(-1)

    profile = play(profile, finished(LOSS)).profile
    expect(profile.totals.streak).toBe(-2)

    for (let i = 0; i < 3; i++) {
      profile = play(profile, finished(WIN, 'standard', 9 - i)).profile
    }

    expect(profile.totals).toMatchObject({
      streak: 3,
      bestWinStreak: 3,
      fastestWin: 7,
    })

    profile = play(profile, finished(DRAW)).profile
    expect(profile.totals.streak).toBe(0)
    expect(profile.peakRating).toBe(90)

    for (let i = 0; i < PROFILE.recentMatches; i++) {
      profile = play(profile, finished(WIN)).profile
    }

    expect(profile.recent).toHaveLength(PROFILE.recentMatches)
    expect(profile.totals.matches).toBe(6 + PROFILE.recentMatches)
  })

  it('survives a save and rejects anything else', () => {
    const { profile } = play(createProfile('2026-09-27T10:00:00.000Z'), finished(WIN))
    expect(parseProfile(serializeProfile(profile))).toEqual(profile)
    expect(parseProfile('{"version":1,"profile":{}}')).toBeNull()
    expect(parseProfile('not json')).toBeNull()
  })
})
