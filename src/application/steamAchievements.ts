import { RANK_TIERS, type RankTier } from '@/content/profile'
import type { Profile } from '@/domain/profile/Profile'
import { levelFor, rankFor } from '@/domain/profile/progression'

/**
 * The game's Steam achievements. Each is read from the profile, so progress made before Steam, on the web or on
 * another device unlocks them too. The names are Steam's API names: once published in Steamworks they never change.
 * `docs/steam-achievements.md` has the titles, descriptions and icons to enter there.
 */
const reachedTier = (profile: Profile, tier: RankTier) =>
  RANK_TIERS.indexOf(rankFor(profile.peakRating).tier) >= RANK_TIERS.indexOf(tier)

const STEAM_ACHIEVEMENTS: Readonly<Record<string, (profile: Profile) => boolean>> = {
  FIRST_WIN: (profile) => profile.totals.wins >= 1,
  WINS_50: (profile) => profile.totals.wins >= 50,
  WIN_STREAK_5: (profile) => profile.totals.bestWinStreak >= 5,
  CAREER_REGULAR: (profile) => profile.career.achievements.regular !== undefined,
  CAREER_THRONE_BREAKER: (profile) => profile.career.achievements.throneBreaker !== undefined,
  CAREER_EXPLORER: (profile) => profile.career.achievements.explorer !== undefined,
  CAREER_STRATEGIST: (profile) => profile.career.achievements.strategist !== undefined,
  CAREER_THREE_STAR: (profile) => profile.career.achievements.threeStar !== undefined,
  TRIAL_SIEGE: (profile) => profile.career.trials.siege !== undefined,
  TRIAL_SYNERGY: (profile) => profile.career.trials.synergy !== undefined,
  TRIAL_ARSENAL: (profile) => profile.career.trials.arsenal !== undefined,
  TRIAL_THREE_FRONTS: (profile) => profile.career.trials.threeFronts !== undefined,
  LEVEL_10: (profile) => levelFor(profile.xp).level >= 10,
  LEVEL_25: (profile) => levelFor(profile.xp).level >= 25,
  RANK_STRATEGIST: (profile) => reachedTier(profile, 'strategist'),
  RANK_SHOTCALLER: (profile) => reachedTier(profile, 'shotcaller'),
}

export const STEAM_ACHIEVEMENT_NAMES = Object.keys(STEAM_ACHIEVEMENTS)

/** Every Steam achievement the profile has earned. */
export function earnedSteamAchievements(profile: Profile) {
  return STEAM_ACHIEVEMENT_NAMES.filter((name) => STEAM_ACHIEVEMENTS[name]?.(profile))
}
