import { HEROES } from '@/content/heroes'
import { HERO_IDS, type HeroId, type Tier } from '@/content/ids'
import { POOL_COPIES } from '@/content/rules'
import { weightedPick, type Rng } from '@/core/random/rng'

export type PoolState = Readonly<Record<HeroId, number>>

/** Shared between both coaches, like the hero pool in any autobattler. */
export class HeroPool {
  private readonly remaining = new Map<HeroId, number>()

  constructor(copies: Readonly<Record<Tier, number>> = POOL_COPIES) {
    for (const id of HERO_IDS) this.remaining.set(id, copies[HEROES[id].tier])
  }

  available(id: HeroId): number {
    return this.remaining.get(id) ?? 0
  }

  release(id: HeroId, count = 1): void {
    this.remaining.set(id, this.available(id) + count)
  }

  draw(tier: Tier, rng: Rng): HeroId | undefined {
    const candidates = HERO_IDS.filter((id) => HEROES[id].tier === tier && this.available(id) > 0)
    const picked = weightedPick(rng, candidates, (id) => this.available(id))
    if (picked) this.remaining.set(picked, this.available(picked) - 1)
    return picked
  }

  snapshot(): PoolState {
    return Object.fromEntries(HERO_IDS.map((id) => [id, this.available(id)])) as PoolState
  }

  restore(state: PoolState): void {
    for (const id of HERO_IDS) this.remaining.set(id, state[id])
  }
}
