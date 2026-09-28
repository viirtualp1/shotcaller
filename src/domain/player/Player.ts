import { err, ok, type Result } from 'neverthrow'
import { HEROES } from '@/content/heroes'
import type { CoachLevel, ItemId, ModeId, TeamId } from '@/content/ids'
import { ITEM_SELL_RATIO, ITEM_SLOTS, ITEMS } from '@/content/items'
import { MODES } from '@/content/modes'
import { COPIES_PER_STAR, ECONOMY, ROSTER } from '@/content/rules'
import type { IdGenerator } from '@/core/ids'
import type { Rng } from '@/core/random/rng'
import type { HeroPool } from '../economy/HeroPool'
import { Shop, type ShopSlot } from '../economy/Shop'
import { Wallet } from '../economy/Wallet'
import type { DomainError } from '../errors'
import { Stash } from '../items/Stash'
import { emptyLedger, type Ledger } from './ledger'
import { CoachProgression } from '../progression/CoachProgression'
import { promoteDuplicates, wouldPromote } from '../roster/promotion'
import { Roster, type OwnedHero, type RosterSlot, type RosterState } from '../roster/Roster'

export interface PlayerDependencies {
  readonly pool: HeroPool
  readonly rng: Rng
  readonly ids: IdGenerator
  readonly mode: ModeId
}

export interface Purchase {
  readonly hero: OwnedHero
  readonly promoted: readonly OwnedHero[]
}

export interface PlayerState {
  readonly gold: number
  readonly level: CoachLevel
  readonly xp: number
  readonly streak: number
  readonly roster: RosterState
  readonly shop: readonly ShopSlot[]
  readonly stash: readonly ItemId[]
  readonly ledger: Ledger
}

export type RoundVerdict = 'win' | 'loss' | 'draw'

export const sellValue = (hero: OwnedHero) => HEROES[hero.heroId].tier * COPIES_PER_STAR[hero.stars]
export const itemSellValue = (item: ItemId) => Math.floor(ITEMS[item].cost * ITEM_SELL_RATIO)

export class Player {
  readonly wallet = new Wallet(ECONOMY.startGold)
  readonly progression: CoachProgression
  readonly roster = new Roster(ROSTER.benchSize)
  readonly stash = new Stash()
  readonly shop: Shop
  private winStreak = 0
  private readonly books: Ledger = emptyLedger()

  constructor(
    readonly team: TeamId,
    private readonly deps: PlayerDependencies,
  ) {
    this.shop = new Shop(deps.pool, deps.rng)
    this.progression = new CoachProgression(MODES[deps.mode].levels)
  }

  get mode() {
    return this.deps.mode
  }

  /** The lanes of the mode; heroes can only be sent to these. */
  get lanes() {
    return MODES[this.deps.mode].lanes
  }

  get level() {
    return this.progression.level
  }

  get boardCapacity() {
    return this.progression.rules.board
  }

  /** New offers follow the odds of the coach's level. */
  restockShop() {
    this.shop.restock(this.progression.rules.odds)
  }

  get streak() {
    return this.winStreak
  }

  get ledger(): Readonly<Ledger> {
    return this.books
  }

  buy(slot: number): Result<Purchase, DomainError> {
    const heroId = this.shop.offerAt(slot)
    if (!heroId) {
      return err({ code: 'slotEmpty' })
    }

    if (!this.roster.hasBenchSpace && !wouldPromote(this.roster, heroId)) {
      return err({ code: 'benchFull' })
    }

    const cost = HEROES[heroId].tier

    return this.wallet.spend(cost).map(() => {
      this.shop.claim(slot)
      this.books.heroesBought++
      this.books.goldSpent += cost

      const hero: OwnedHero = {
        uid: this.deps.ids(),
        heroId,
        stars: 1,
        items: [],
      }

      this.roster.add(hero)
      const { promoted, freedItems } = promoteDuplicates(this.roster)
      this.storeOrRefund(freedItems)
      this.books.promotions += promoted.length

      return {
        hero,
        promoted,
      }
    })
  }

  sell(uid: string): Result<number, DomainError> {
    const hero = this.roster.remove(uid)
    if (!hero) {
      return err({ code: 'heroNotFound' })
    }

    const value = sellValue(hero)
    this.wallet.earn(value)
    this.books.heroesSold++
    this.books.goldFromSales += value
    this.deps.pool.release(hero.heroId, COPIES_PER_STAR[hero.stars])
    this.storeOrRefund(hero.items)

    return ok(value)
  }

  reroll(): Result<void, DomainError> {
    return this.wallet.spend(ECONOMY.rerollCost).map(() => {
      this.books.rerolls++
      this.books.goldSpent += ECONOMY.rerollCost
      this.restockShop()
    })
  }

  buyXp(): Result<void, DomainError> {
    if (this.progression.isMaxLevel) {
      return err({ code: 'maxLevel' })
    }

    return this.wallet.spend(ECONOMY.xpCost).map(() => {
      this.books.xpBought++
      this.books.goldSpent += ECONOMY.xpCost
      this.progression.gain(ECONOMY.xpPerPurchase)
    })
  }

  buyItem(item: ItemId): Result<void, DomainError> {
    if (this.stash.isFull) {
      return err({ code: 'stashFull' })
    }

    return this.wallet
      .spend(ITEMS[item].cost)
      .andThen(() => this.stash.put(item))
      .map(() => {
        this.books.itemsBought++
        this.books.goldSpent += ITEMS[item].cost
      })
  }

  sellItem(index: number): Result<number, DomainError> {
    return this.stash.take(index).map((item) => {
      const value = itemSellValue(item)
      this.wallet.earn(value)
      this.books.itemsSold++
      this.books.goldFromSales += value

      return value
    })
  }

  equip(stashIndex: number, uid: string): Result<void, DomainError> {
    const location = this.roster.locate(uid)
    if (!location) {
      return err({ code: 'heroNotFound' })
    }

    if (location.hero.items.length >= ITEM_SLOTS) {
      return err({ code: 'itemSlotsFull' })
    }

    return this.stash.take(stashIndex).map((item) => void location.hero.items.push(item))
  }

  unequip(uid: string, itemIndex: number): Result<void, DomainError> {
    const hero = this.roster.locate(uid)?.hero
    if (!hero) {
      return err({ code: 'heroNotFound' })
    }

    const item = hero.items[itemIndex]
    if (!item) {
      return err({ code: 'itemNotFound' })
    }

    return this.stash.put(item).map(() => void hero.items.splice(itemIndex, 1))
  }

  move(uid: string, to: RosterSlot): Result<void, DomainError> {
    if (to !== 'bench' && !this.lanes.includes(to)) {
      return err({ code: 'laneClosed' })
    }

    return this.roster.move(uid, to, this.boardCapacity)
  }

  swap(a: string, b: string): Result<void, DomainError> {
    return this.roster.swap(a, b)
  }

  prepareRound() {
    this.progression.gain(ECONOMY.passiveXpPerRound)
    this.restockShop()
  }

  recordRound(verdict: RoundVerdict, income: number) {
    this.wallet.earn(income)

    if (verdict === 'draw') {
      this.winStreak = 0
    } else if (verdict === 'win') {
      this.winStreak = Math.max(1, this.winStreak + 1)
    } else {
      this.winStreak = Math.min(-1, this.winStreak - 1)
    }
  }

  snapshot() {
    return {
      gold: this.wallet.gold,
      level: this.progression.level,
      xp: this.progression.xp,
      streak: this.winStreak,
      roster: this.roster.snapshot(),
      shop: [...this.shop.slots],
      stash: [...this.stash.items],
      ledger: { ...this.books },
    }
  }

  restore(state: PlayerState) {
    this.wallet.restore(state.gold)
    this.progression.restore(state.level, state.xp)
    this.winStreak = state.streak
    this.roster.restore(state.roster)
    this.shop.restore(state.shop)
    this.stash.restore(state.stash)
    Object.assign(this.books, state.ledger)
  }

  /** Items with nowhere to go are sold rather than silently lost. */
  private storeOrRefund(items: readonly ItemId[]) {
    for (const item of items) {
      if (this.stash.put(item).isErr()) {
        this.wallet.earn(itemSellValue(item))
      }
    }
  }
}
