import type { HeroId, Tier } from '@/content/ids'
import type { LevelRules } from '@/content/modes'
import { ROSTER } from '@/content/rules'
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

  get slots() {
    return this.offers
  }

  offerAt(slot: number) {
    return this.offers[slot] ?? null
  }

  restock(odds: LevelRules['odds']) {
    for (const id of this.offers) {
      if (id) {
        this.pool.release(id)
      }
    }

    this.offers = Array.from({ length: this.size }, () => this.drawOffer(odds))
  }

  claim(slot: number) {
    const id = this.offerAt(slot)
    if (id) {
      this.offers[slot] = null
    }

    return id
  }

  restore(offers: readonly ShopSlot[]) {
    this.offers = [...offers]
  }

  private drawOffer(odds: LevelRules['odds']) {
    const rolled = this.rollTier(odds)

    const fallbackOrder = [
      rolled,
      ...TIERS.filter((t) => t < rolled).reverse(),
      ...TIERS.filter((t) => t > rolled),
    ]

    for (const tier of fallbackOrder) {
      const id = this.pool.draw(tier, this.rng)
      if (id) {
        return id
      }
    }

    return null
  }

  private rollTier(odds: LevelRules['odds']) {
    let roll = this.rng.next()
    for (const tier of TIERS) {
      const chance = odds[tier - 1] ?? 0
      if (roll < chance) {
        return tier
      }

      roll -= chance
    }

    return 1
  }
}
