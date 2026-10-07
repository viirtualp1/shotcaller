import { FACTIONS, factionTier, type FactionBonus, type FactionTier } from '@/content/factions'
import { HEROES } from '@/content/heroes'
import { FACTION_IDS, type FactionId, type HeroId } from '@/content/ids'

/** A faction with at least one hero on the lane, and the step its heroes reach there. */
export interface FactionStanding {
  readonly faction: FactionId
  readonly count: number
  readonly tier: FactionTier | null
}

/** What one hero of the lane gets from its faction there. */
export interface HeroFaction {
  readonly faction: FactionId
  readonly tier: FactionTier
  readonly bonus: FactionBonus
}

export interface LaneFactions {
  /** Factions on the lane, most heroes first, then in the usual order. */
  readonly standings: readonly FactionStanding[]
  /** The faction each hero counts for, in lineup order; a Changeling with nobody to join has none. */
  readonly heroFactions: readonly (FactionId | null)[]
  /** The bonus the hero in this lineup slot gets; null without one. */
  bonusFor(slot: number): HeroFaction | null
}

/**
 * Counts the factions of a lane. A Changeling joins the faction with the most heroes on its lane, the first in the
 * usual order on a tie, and counts as one of them; on a lane with nobody to join it stays without one.
 */
export function laneFactions(heroIds: readonly HeroId[]): LaneFactions {
  const counts = new Map<FactionId, number>()

  for (const id of heroIds) {
    const faction = HEROES[id].faction
    if (faction) {
      counts.set(faction, (counts.get(faction) ?? 0) + 1)
    }
  }

  const strongest = () =>
    FACTION_IDS.reduce<FactionId | null>(
      (best, faction) => ((counts.get(faction) ?? 0) > (best ? (counts.get(best) ?? 0) : 0) ? faction : best),
      null,
    )

  const heroFactions = heroIds.map((id) => HEROES[id].faction)

  heroIds.forEach((id, index) => {
    if (HEROES[id].faction !== null) {
      return
    }

    const joined = strongest()
    if (joined) {
      heroFactions[index] = joined
      counts.set(joined, counts.get(joined)! + 1)
    }
  })

  const standings = FACTION_IDS.filter((faction) => counts.has(faction))
    .map((faction) => ({
      faction,
      count: counts.get(faction)!,
      tier: factionTier(counts.get(faction)!),
    }))
    .sort((a, b) => b.count - a.count)

  return {
    standings,
    heroFactions,
    bonusFor(slot) {
      const faction = heroFactions[slot]
      const tier = faction ? factionTier(counts.get(faction)!) : null

      return faction && tier
        ? {
            faction,
            tier,
            bonus: FACTIONS[faction].tiers[tier],
          }
        : null
    },
  }
}
