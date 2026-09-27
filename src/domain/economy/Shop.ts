import type { CoachLevel, HeroId, Tier } from '@/content/ids'
import { ROSTER, SHOP_ODDS } from '@/content/rules'
import type { Rng } from '@/core/random/rng'
import type { HeroPool } from './HeroPool'

export type ShopSlot = HeroId | null

const TIERS: readonly Tier[] = [1, 2, 3]

export class Shop {
  private offers: ShopSlot[] = []

  constructor(
    private readonly pool: HeroPool,
    private readonly rng: Rng,
    private readonly size: number = ROSTER.shopSize,
  ) {}

  get slots(): readonly ShopSlot[] {
    return this.offers
  }

  offerAt(slot: number): ShopSlot {
    return this.offers[slot] ?? null
  }

  restock(level: CoachLevel): void {
    for (const id of this.offers) if (id) this.pool.release(id)
    this.offers = Array.from({ length: this.size }, () => this.drawOffer(level))
  }

  claim(slot: number): HeroId | null {
    const id = this.offerAt(slot)
    if (id) this.offers[slot] = null
    return id
  }

  restore(offers: readonly ShopSlot[]): void {
    this.offers = [...offers]
  }

  private drawOffer(level: CoachLevel): ShopSlot {
    const rolled = this.rollTier(level)
    const fallbackOrder = [
      rolled,
      ...TIERS.filter((t) => t < rolled).reverse(),
      ...TIERS.filter((t) => t > rolled),
    ]
    for (const tier of fallbackOrder) {
      const id = this.pool.draw(tier, this.rng)
      if (id) return id
    }
    return null
  }

  private rollTier(level: CoachLevel): Tier {
    let roll = this.rng.next()
    const odds = SHOP_ODDS[level]
    for (const tier of TIERS) {
      const chance = odds[tier - 1] ?? 0
      if (roll < chance) return tier
      roll -= chance
    }
    return 1
  }
}
