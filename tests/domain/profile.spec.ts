import { describe, expect, it } from 'vitest'
import { parseProfile, serializeProfile } from '@/application/persistence/profileSnapshot'
import { PROFILE } from '@/content/profile'
import {
  applyRecord,
  avatarOf,
  createProfile,
  hasDetails,
  isRated,
  matchRecordOf,
} from '@/domain/profile/Profile'
import { levelFor, rankFor, rankStep, ratingChange } from '@/domain/profile/progression'
import { DRAW, duelMatch as duel, finishedMatch as finished, LOSS, play, WIN } from '../helpers/profile'

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

  it('pays more for a throne', () => {
    expect(ratingChange(WIN)).toBe(30)

    expect(
      ratingChange({
        ...WIN,
        reason: 'roundLimit',
      }),
    ).toBe(25)

    expect(ratingChange(LOSS)).toBe(-20)
    expect(ratingChange(DRAW)).toBe(0)
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
      ratingAfter: 0,
      xp: 180,
      towersDestroyed: 2,
    })

    expect(isRated(record)).toBe(false)
    expect(profile.xp).toBe(180)

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
    profile = play(profile, duel(LOSS)).profile
    expect(profile.rating).toBe(0)
    expect(profile.totals.streak).toBe(-1)

    profile = play(profile, finished(LOSS)).profile
    expect(profile.totals.streak).toBe(-2)

    for (let i = 0; i < 3; i++) {
      profile = play(profile, duel(WIN, 9 - i)).profile
    }

    expect(profile.totals).toMatchObject({
      streak: 3,
      bestWinStreak: 3,
      fastestWin: 7,
    })

    profile = play(profile, duel(DRAW)).profile
    expect(profile.totals.streak).toBe(0)
    expect(profile.peakRating).toBe(90)

    for (let i = 0; i < PROFILE.recentMatches; i++) {
      profile = play(profile, finished(WIN)).profile
    }

    expect(profile.recent).toHaveLength(PROFILE.recentMatches)
    expect(profile.totals.matches).toBe(6 + PROFILE.recentMatches)
  })

  it('keeps both sides and every round for the match details', () => {
    const match = finished(WIN)

    const { profile, record } = play(createProfile('2026-09-27T10:00:00.000Z'), {
      ...match,
      stats: {
        ...match.stats,
        winners: [0, 1, null, 0],
      },
    })

    expect(record.history).toEqual(['win', 'loss', 'draw', 'win'])
    expect(record.opponentHeroes.map((h) => h.heroId)).toEqual(['giant'])

    expect(record.opponentLineup).toEqual([
      {
        heroId: 'giant',
        stars: 1,
        lane: 'top',
        items: [],
      },
    ])

    expect(hasDetails(record)).toBe(true)
    expect(profile.heroes.blademaster?.detailed).toBe(1)
  })

  it('reads matches saved before the details and leaves them out of the averages', () => {
    const { profile } = play(createProfile('2026-09-27T10:00:00.000Z'), finished(WIN))
    const saved = JSON.parse(serializeProfile(profile))
    const old = saved.profile.recent[0]

    for (const key of ['opponentLineup', 'opponentSynergies', 'opponentHeroes', 'history']) {
      delete old[key]
    }

    for (const line of old.heroes) {
      for (const key of ['healing', 'structureDamage', 'damageReceived', 'rounds', 'lastHits']) {
        delete line[key]
      }
    }

    const parsed = parseProfile(JSON.stringify(saved))!
    const legacy = parsed.recent[0]!

    expect(hasDetails(legacy)).toBe(false)

    expect(legacy.heroes[0]).toMatchObject({
      healing: 0,
      rounds: 0,
    })

    const another = {
      ...legacy,
      id: 'legacy-2',
    }

    expect(applyRecord(parsed, another).profile.heroes.blademaster).toMatchObject({
      matches: 2,
      detailed: 1,
    })
  })

  it('moves the rating only for a duel, which also names the opponent', () => {
    const solo = play(createProfile('2026-09-27T10:00:00.000Z'), finished(WIN)).profile
    const { profile, record } = play(createProfile('2026-09-27T10:00:00.000Z'), duel(WIN))

    expect(record).toMatchObject({
      duel: { opponentName: 'Rival' },
      ratingBefore: 0,
      ratingAfter: 30,
    })

    expect(isRated(record)).toBe(true)
    expect(solo.rating).toBe(0)
    expect(profile.rating).toBe(30)
    expect(profile.xp).toBe(solo.xp)
    expect(profile.totals).toEqual(solo.totals)
    expect(profile.heroes).toEqual(solo.heroes)
    expect(parseProfile(serializeProfile(profile))).toEqual(profile)
  })

  it('takes rating from a coach who gives up a duel and counts a settled duel once', () => {
    const start = {
      ...createProfile('2026-09-27T10:00:00.000Z'),
      rating: 100,
    }

    const forfeit = (winner: 0 | 1) =>
      matchRecordOf(
        duel({
          winner,
          reason: 'forfeit',
        }),
        {
          id: 'duel-1',
          playedAt: '2026-09-27T12:00:00.000Z',
        },
      )

    const lost = applyRecord(start, forfeit(1))
    expect(lost.profile.rating).toBe(80)
    expect(lost.profile.totals.losses).toBe(1)
    expect(parseProfile(serializeProfile(lost.profile))).toEqual(lost.profile)

    const again = applyRecord(lost.profile, forfeit(1))
    expect(again.duplicate).toBe(true)
    expect(again.profile).toBe(lost.profile)

    expect(applyRecord(start, forfeit(0)).profile.rating).toBe(125)
  })

  it('survives a save and rejects anything else', () => {
    const { profile } = play(createProfile('2026-09-27T10:00:00.000Z'), finished(WIN))
    expect(parseProfile(serializeProfile(profile))).toEqual(profile)
    expect(parseProfile('{"version":1,"profile":{}}')).toBeNull()
    expect(parseProfile('not json')).toBeNull()
  })
})
