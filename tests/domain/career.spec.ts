import { describe, expect, it } from 'vitest'
import { createMatch, restoreMatch } from '@/application/createMatch'
import { parseProfile, serializeProfile } from '@/application/persistence/profileSnapshot'
import { parseSnapshot, serializeSnapshot } from '@/application/persistence/snapshot'
import { toMatchView } from '@/application/views'
import { TRIALS } from '@/content/career'
import { sequentialIds } from '@/core/ids'
import {
  careerWeek,
  earnedMatchXp,
  nextCareerWeek,
  trialPassed,
  weeklyContracts,
} from '@/domain/profile/career'
import { applyRecord, createProfile, matchRecordOf, type MatchRecord } from '@/domain/profile/Profile'
import { finishedMatch, LOSS, play, WIN } from '../helpers/profile'

const start = () => createProfile('2026-09-27T10:00:00.000Z')

const record = (id: string, playedAt = '2026-09-30T12:00:00.000Z') =>
  matchRecordOf(finishedMatch(WIN), {
    id,
    playedAt,
  })

describe('career rewards', () => {
  it('grants rewards once and keeps base match XP separate from bonuses during replay', () => {
    let profile = start()
    const records: MatchRecord[] = []
    for (let i = 0; i < 5; i++) {
      const result = applyRecord(profile, record(`match-${i}`))
      profile = result.profile
      records.push(result.record)
    }

    expect(
      records
        .flatMap((match) => match.rewards)
        .filter((reward) => reward.kind === 'achievement' && reward.id === 'throneBreaker'),
    ).toHaveLength(1)

    expect(
      records
        .flatMap((match) => match.rewards)
        .filter((reward) => reward.kind === 'weekly' && reward.id === 'matches'),
    ).toHaveLength(1)

    expect(profile.xp).toBe(records.reduce((sum, match) => sum + earnedMatchXp(match), 0))
    expect(profile.career.achievements.regular).toBeDefined()

    const replayed = records.reduce((profile, match) => applyRecord(profile, match).profile, start())
    expect(replayed).toEqual(profile)
    expect(applyRecord(replayed, records[0]!).profile).toBe(replayed)
    expect(parseProfile(serializeProfile(profile))).toEqual(profile)
  })

  it('counts losses and excludes forfeits from contracts', () => {
    const lost = matchRecordOf(finishedMatch(LOSS), {
      id: 'lost',
      playedAt: '2026-09-30T12:00:00.000Z',
    })

    const after = applyRecord(start(), lost).profile
    expect(after.career.weeks['2026-09-28']?.progress).toMatchObject({
      matches: 1,
      rounds: 6,
      towers: 2,
    })

    const forfeited = {
      ...lost,
      id: 'forfeit',
      reason: 'forfeit' as const,
    }

    const next = applyRecord(after, forfeited).profile
    expect(next.career.weeks).toEqual(after.career.weeks)
    expect(next.recent[0]?.rewards.filter((reward) => reward.kind === 'weekly')).toEqual([])
  })

  it('keeps delayed offline matches in their original week', () => {
    let profile = applyRecord(start(), record('new-week', '2026-10-05T01:00:00.000Z')).profile
    profile = applyRecord(profile, record('old-week', '2026-09-30T12:00:00.000Z')).profile
    expect(profile.career.weeks['2026-10-05']?.progress.matches).toBe(1)
    expect(profile.career.weeks['2026-09-28']?.progress.matches).toBe(1)
    expect(parseProfile(serializeProfile(profile))).toEqual(profile)
  })

  it('uses a shared Monday boundary and a stable set of three distinct contracts', () => {
    expect(careerWeek('2026-09-28T03:59:59+04:00')).toBe('2026-09-21')
    expect(careerWeek('2026-09-28T04:00:00+04:00')).toBe('2026-09-28')
    expect(nextCareerWeek('2026-09-28').toISOString()).toBe('2026-10-05T00:00:00.000Z')
    const contracts = weeklyContracts('2026-09-28')
    expect(contracts).toHaveLength(3)
    expect(new Set(contracts.map((contract) => contract.id)).size).toBe(3)
    expect(contracts[0]?.id).toBe('matches')
    expect(weeklyContracts('2026-10-05')).not.toEqual(contracts)
  })

  it('migrates old accounts with earned milestones without paying them again', () => {
    const old = JSON.parse(serializeProfile(start()))
    old.version = 1
    delete old.profile.career
    old.profile.xp = 1000
    old.profile.totals.matches = 7
    old.profile.totals.throneWins = 4

    const migrated = parseProfile(JSON.stringify(old))!
    expect(migrated.xp).toBe(1250)
    expect(Object.keys(migrated.career.achievements).sort()).toEqual(['regular', 'throneBreaker'])
    expect(parseProfile(serializeProfile(migrated))).toEqual(migrated)
    const after = play(migrated, finishedMatch(WIN))
    expect(after.record.rewards.filter((reward) => reward.kind === 'achievement')).toEqual([])
  })
})

describe('solo trials', () => {
  it('grants a first clear once, updates a record on replay, and requires the profile level', () => {
    const trial: MatchRecord = {
      ...record('first'),
      mode: 'twoLanes',
      trialId: 'siege',
    }

    const locked = applyRecord(start(), trial)
    expect(locked.profile.career.trials.siege).toBeUndefined()

    const first = applyRecord(
      {
        ...start(),
        xp: 200,
      },
      trial,
    )

    expect(first.record.rewards).toContainEqual({
      kind: 'trial',
      id: 'siege',
      xp: 150,
    })

    expect(first.profile.career.trials.siege?.bestRounds).toBe(6)

    const replay = applyRecord(first.profile, {
      ...trial,
      id: 'second',
      rounds: 4,
    })

    expect(replay.profile.career.trials.siege?.bestRounds).toBe(4)
    expect(replay.record.rewards.filter((reward) => reward.kind === 'trial')).toEqual([])
  })

  it('checks the objective as well as a legitimate standard solo win', () => {
    const base: MatchRecord = {
      ...record('trial'),
      mode: 'twoLanes',
      trialId: 'siege',
    }

    expect(trialPassed(base)).toBe(true)

    for (const changed of [
      { verdict: 'loss' as const },
      { reason: 'roundLimit' as const },
      { rounds: 0 },
      { difficulty: 'relaxed' as const },
      { duel: { opponentName: 'Rival' } },
      { mode: 'oneLane' as const },
    ]) {
      expect(
        trialPassed({
          ...base,
          ...changed,
        }),
      ).toBe(false)
    }

    const synergy: MatchRecord = {
      ...base,
      trialId: 'synergy',
      synergies: ['guardian', 'siege', 'trilane'],
    }

    expect(trialPassed(synergy)).toBe(true)

    expect(
      trialPassed({
        ...synergy,
        synergies: ['guardian', 'siege'],
      }),
    ).toBe(false)

    const arsenal: MatchRecord = {
      ...base,
      trialId: 'arsenal',
      mode: 'oneLane',
      lineup: base.lineup.map((hero) => ({
        ...hero,
        lane: 'mid',
        items: ['boots', 'gloves'],
      })),
    }

    expect(trialPassed(arsenal)).toBe(true)

    expect(
      trialPassed({
        ...arsenal,
        lineup: arsenal.lineup.slice(1),
      }),
    ).toBe(false)

    const fronts: MatchRecord = {
      ...synergy,
      trialId: 'threeFronts',
      mode: 'threeLanes',
      lineup: synergy.lineup.map((hero, i) => ({
        ...hero,
        lane: (['top', 'mid', 'bot'] as const)[i]!,
      })),
    }

    expect(trialPassed(fronts)).toBe(true)

    expect(
      trialPassed({
        ...fronts,
        lineup: fronts.lineup.map((hero) => ({
          ...hero,
          lane: 'mid',
        })),
      }),
    ).toBe(false)
  })

  it('restores trial identity and never turns an online duel into a trial', () => {
    for (const trial of TRIALS) {
      const match = createMatch({
        trialId: trial.id,
        difficulty: 'relaxed',
        mode: 'threeLanes',
        ids: sequentialIds('trial'),
      })

      expect(match.mode).toBe(trial.mode)

      const restored = restoreMatch(parseSnapshot(serializeSnapshot(match.snapshot()))!, {
        difficulty: 'relaxed',
      })

      expect(restored.trialId).toBe(trial.id)
      expect(toMatchView(restored)).toEqual(toMatchView(match))

      const second = createMatch({
        trialId: trial.id,
        ids: sequentialIds('second'),
      })

      expect(second.human.shop.slots).toEqual(match.human.shop.slots)
      expect(second.opponent.shop.slots).toEqual(match.opponent.shop.slots)
    }

    const online = createMatch({
      trialId: 'siege',
      mode: 'oneLane',
      link: {
        seed: 'duel',
        side: 0,
      },
    })

    expect(online.trialId).toBeNull()
    expect(online.mode).toBe('oneLane')
  })
})
