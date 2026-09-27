import type { HeroId } from '@/content/ids'
import type { Difficulty } from '@/content/rules'
import type { MatchResult } from '@/domain/match/judge'
import { emptyMatchStats, type HeroMatchStats, type MatchStats } from '@/domain/match/matchStats'
import { recordMatch, type FinishedMatch, type Profile } from '@/domain/profile/Profile'

export const WIN: MatchResult = {
  winner: 0,
  reason: 'throne',
}

export const LOSS: MatchResult = {
  winner: 1,
  reason: 'throne',
}

export const DRAW: MatchResult = {
  winner: null,
  reason: 'roundLimit',
}

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

/** A small finished match: Blademaster and Acolyte on bot, Pyromancer alone in mid. */
export function finishedMatch(
  result: MatchResult,
  difficulty: Difficulty = 'standard',
  rounds = 6,
): FinishedMatch {
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

let seq = 0

export const play = (profile: Profile, match: FinishedMatch) =>
  recordMatch(profile, match, {
    id: `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`,
    playedAt: '2026-09-27T12:00:00.000Z',
  })
