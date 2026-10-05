import { describe, expect, it } from 'vitest'
import { earnedSteamAchievements, STEAM_ACHIEVEMENT_NAMES } from '@/application/steamAchievements'
import { createProfile, type Profile } from '@/domain/profile/Profile'

const fresh = createProfile('2026-10-05T00:00:00.000Z')

const withTotals = (profile: Profile, totals: Partial<Profile['totals']>): Profile => ({
  ...profile,
  totals: {
    ...profile.totals,
    ...totals,
  },
})

describe('Steam achievements', () => {
  it('uses fixed Steam API names', () => {
    expect(STEAM_ACHIEVEMENT_NAMES).toHaveLength(16)

    for (const name of STEAM_ACHIEVEMENT_NAMES) {
      expect(name).toMatch(/^[A-Z0-9_]{1,64}$/)
    }
  })

  it('gives a new coach nothing', () => {
    expect(earnedSteamAchievements(fresh)).toEqual([])
  })

  it('reads wins and streaks from the totals', () => {
    expect(earnedSteamAchievements(withTotals(fresh, { wins: 1 }))).toEqual(['FIRST_WIN'])

    const veteran = withTotals(fresh, {
      wins: 50,
      bestWinStreak: 5,
    })

    expect(earnedSteamAchievements(veteran)).toEqual(['FIRST_WIN', 'WINS_50', 'WIN_STREAK_5'])
  })

  it('mirrors career achievements and trials already earned, before Steam too', () => {
    const career: Profile = {
      ...fresh,
      career: {
        ...fresh.career,
        achievements: { throneBreaker: '2026-09-01T00:00:00.000Z' },
        trials: {
          siege: {
            completedAt: '2026-09-02T00:00:00.000Z',
            bestRounds: 9,
          },
        },
      },
    }

    expect(earnedSteamAchievements(career)).toEqual(['CAREER_THRONE_BREAKER', 'TRIAL_SIEGE'])
  })

  it('counts the best rank reached, not the current one', () => {
    const peaked: Profile = {
      ...fresh,
      rating: 0,
      peakRating: 600,
    }

    expect(earnedSteamAchievements(peaked)).toContain('RANK_STRATEGIST')
    expect(earnedSteamAchievements(peaked)).not.toContain('RANK_SHOTCALLER')
  })
})
