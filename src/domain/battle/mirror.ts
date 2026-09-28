import { opponentOf, type TeamId } from '@/content/ids'
import type { BattleOutcome, PerTeam } from './contracts'

/**
 * Online, the host fights as team 0 and the guest as team 1, and both devices run that same battle.
 * The guest still sees the match from its own side: these helpers turn battle order into "mine first" and back.
 */
export const mirrorPair = <T>([a, b]: PerTeam<T>): PerTeam<T> => [b, a]

/** A battle team as the player fighting as `side` sees it: 0 is their own. The mapping is its own inverse. */
export const seenFrom = (side: TeamId, team: TeamId): TeamId => (team === side ? 0 : 1)

/** A pair seen from `side` in battle order, or a battle-order pair seen from `side`: the swap is its own inverse. */
export const fromSide = <T>(side: TeamId, pair: PerTeam<T>) => (side === 0 ? pair : mirrorPair(pair))

export function mirrorOutcome(outcome: BattleOutcome): BattleOutcome {
  return {
    structures: mirrorPair(outcome.structures),
    stats: mirrorPair(outcome.stats),
    throneFell: outcome.throneFell === null ? null : opponentOf(outcome.throneFell),
    heroes: outcome.heroes.map((hero) => ({
      ...hero,
      team: opponentOf(hero.team),
    })),
  }
}
