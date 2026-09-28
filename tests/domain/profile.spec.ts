import { describe, expect, it } from 'vitest'
import { parseProfile, serializeProfile } from '@/application/persistence/profileSnapshot'
import { PROFILE } from '@/content/profile'
import { applyRecord, avatarOf, createProfile, hasDetails } from '@/domain/profile/Profile'
import { levelFor, rankFor, rankStep, ratingChange } from '@/domain/profile/progression'
import { DRAW, finishedMatch as finished, LOSS, play, WIN } from '../helpers/profile'

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

    expect(applyRecord(parsed, legacy).profile.heroes.blademaster).toMatchObject({
      matches: 2,
      detailed: 1,
    })
  })

  it('keeps a duel in the history without touching the rating, XP or lifetime stats', () => {
    const before = play(createProfile('2026-09-27T10:00:00.000Z'), finished(WIN)).profile

    const { profile, record } = play(before, {
      ...finished(WIN),
      duel: { opponentName: 'Rival' },
    })

    expect(record).toMatchObject({
      duel: { opponentName: 'Rival' },
      verdict: 'win',
      ratingBefore: before.rating,
      ratingAfter: before.rating,
      xp: 0,
    })

    expect(profile.recent[0]).toBe(record)
    expect(profile.recent).toHaveLength(2)
    expect(profile.rating).toBe(before.rating)
    expect(profile.xp).toBe(before.xp)
    expect(profile.totals).toEqual(before.totals)
    expect(profile.heroes).toEqual(before.heroes)
    expect(parseProfile(serializeProfile(profile))).toEqual(profile)
  })

  it('survives a save and rejects anything else', () => {
    const { profile } = play(createProfile('2026-09-27T10:00:00.000Z'), finished(WIN))
    expect(parseProfile(serializeProfile(profile))).toEqual(profile)
    expect(parseProfile('{"version":1,"profile":{}}')).toBeNull()
    expect(parseProfile('not json')).toBeNull()
  })
})
