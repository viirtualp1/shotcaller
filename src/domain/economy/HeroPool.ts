import { HEROES } from '@/content/heroes'
import { HERO_IDS, type HeroId, type Tier } from '@/content/ids'
import { POOL_COPIES } from '@/content/rules'
import { weightedPick, type Rng } from '@/core/random/rng'

export type PoolState = Readonly<Partial<Record<HeroId, number>>>

/** Shared between both coaches, like the hero pool in any autobattler. */
export class HeroPool {
  private readonly remaining = new Map<HeroId, number>()
  private readonly initial = new Map<HeroId, number>()

  constructor(copies: Readonly<Record<Tier, number>> = POOL_COPIES) {
    for (const id of HERO_IDS) {
      this.initial.set(id, HEROES[id].copies ?? copies[HEROES[id].tier])
      this.remaining.set(id, this.initial.get(id)!)
    }
  }

  available(id: HeroId) {
    return this.remaining.get(id) ?? 0
  }

  release(id: HeroId, count = 1) {
    this.remaining.set(id, this.available(id) + count)
  }

  draw(tier: Tier, rng: Rng) {
    const candidates = HERO_IDS.filter((id) => HEROES[id].tier === tier && this.available(id) > 0)
    const picked = weightedPick(rng, candidates, (id) => this.available(id))
    if (picked) {
      this.remaining.set(picked, this.available(picked) - 1)
    }

    return picked
  }

  snapshot() {
    return Object.fromEntries(HERO_IDS.map((id) => [id, this.available(id)])) as Record<HeroId, number>
  }

  /** Keeps a random few heroes of each tier and takes the rest out of this match; returns the heroes kept. */
  rotate(rng: Rng, perTier: number) {
    const roster: HeroId[] = []
    for (const tier of [1, 2, 3] as const) {
      const heroes = HERO_IDS.filter((id) => HEROES[id].tier === tier)
      const kept = new Set<HeroId>()
      while (kept.size < Math.min(perTier, heroes.length)) {
        const left = heroes.filter((id) => !kept.has(id))
        kept.add(left[Math.floor(rng.next() * left.length)]!)
      }

      for (const id of heroes) {
        if (kept.has(id)) {
          roster.push(id)
        } else {
          this.remaining.set(id, 0)
        }
      }
    }

    return roster
  }

  /** Heroes added after the match was saved join with all their copies. */
  restore(state: PoolState) {
    for (const id of HERO_IDS) {
      this.remaining.set(id, state[id] ?? this.initial.get(id)!)
    }
  }
}
