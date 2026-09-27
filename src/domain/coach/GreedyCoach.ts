import { HEROES } from '@/content/heroes'
import type { HeroId, ItemId, RoleId } from '@/content/ids'
import { ITEM_SLOTS, ITEMS } from '@/content/items'
import { COPIES_PER_STAR, ECONOMY } from '@/content/rules'
import type { Player } from '../player/Player'
import { arrangeStrongestLineup } from './arrange'
import type { CoachContext, CoachStrategy } from './CoachStrategy'
import { heroPower, LaneOptimizer } from './LaneOptimizer'

interface GreedyCoachOptions {
  readonly levelFromRound: number
  readonly goldReserveForXp: number
  readonly rerollFromRound: number
  readonly rerollAboveGold: number
  readonly maxRerolls: number
  readonly spareHeroes: number
  readonly benchLimitOverTeam: number
  readonly itemsFromRound: number
  readonly goldReserveForItems: number
}

const DEFAULTS: GreedyCoachOptions = {
  levelFromRound: 2,
  goldReserveForXp: 2,
  rerollFromRound: 3,
  rerollAboveGold: 8,
  maxRerolls: 3,
  spareHeroes: 2,
  benchLimitOverTeam: 4,
  itemsFromRound: 3,
  goldReserveForItems: 4,
}

const ITEM_WISHLIST: Readonly<Record<RoleId, readonly ItemId[]>> = {
  carry: ['broadsword', 'gloves', 'vampireFang'],
  support: ['vitality', 'manaStone', 'chainmail'],
  mage: ['staff', 'manaStone', 'vitality'],
  initiator: ['chainmail', 'vitality', 'thornMail'],
  pusher: ['gloves', 'broadsword', 'boots'],
  ganker: ['broadsword', 'vampireFang', 'boots'],
}

const MAX_ACTIONS_PER_TURN = 40

export class GreedyCoach implements CoachStrategy {
  private readonly options: GreedyCoachOptions

  constructor(
    private readonly optimizer = new LaneOptimizer(),
    options: Partial<GreedyCoachOptions> = {},
  ) {
    this.options = {
      ...DEFAULTS,
      ...options,
    }
  }

  playTurn(player: Player, context: CoachContext) {
    let rerolls = 0
    for (let action = 0; action < MAX_ACTIONS_PER_TURN; action++) {
      if (this.buyCopy(player)) {
        continue
      }

      if (this.levelUp(player, context)) {
        continue
      }

      if (this.recruit(player, context)) {
        continue
      }

      if (rerolls < this.options.maxRerolls && this.reroll(player, context)) {
        rerolls++
        continue
      }

      break
    }

    this.trimBench(player)
    arrangeStrongestLineup(player, this.optimizer, context.rng)
    this.outfit(player, context)
  }

  private buyCopy(player: Player) {
    const owned = new Set(player.roster.all().map((h) => h.heroId))

    const slot = player.shop.slots.findIndex(
      (id) => id !== null && owned.has(id) && HEROES[id].tier <= player.wallet.gold,
    )

    return slot >= 0 && player.buy(slot).isOk()
  }

  private levelUp(player: Player, { round }: CoachContext) {
    const affordable = player.wallet.gold >= ECONOMY.xpCost + this.options.goldReserveForXp
    const hasTeam = player.roster.all().length >= player.boardCapacity
    return round >= this.options.levelFromRound && affordable && hasTeam && player.buyXp().isOk()
  }

  private recruit(player: Player, { rng }: CoachContext) {
    const owned = player.roster.all()
    if (owned.length >= player.boardCapacity + this.options.spareHeroes) {
      return false
    }

    const roles = new Set(owned.map((h) => HEROES[h.heroId].role))
    const score = (id: HeroId) => HEROES[id].tier * 2 + (roles.has(HEROES[id].role) ? 0 : 1.5) + rng.next()

    const best = player.shop.slots
      .map((id, slot) => ({
        id,
        slot,
      }))
      .filter(
        (o): o is { id: HeroId; slot: number } => o.id !== null && HEROES[o.id].tier <= player.wallet.gold,
      )
      .sort((a, b) => score(b.id) - score(a.id))[0]

    return best !== undefined && player.buy(best.slot).isOk()
  }

  private reroll(player: Player, { round }: CoachContext) {
    if (round < this.options.rerollFromRound || player.wallet.gold < this.options.rerollAboveGold) {
      return false
    }

    return player.reroll().isOk()
  }

  private trimBench(player: Player) {
    const all = player.roster.all()
    const excess = all.length - (player.boardCapacity + this.options.benchLimitOverTeam)
    if (excess <= 0) {
      return
    }

    const copies = (id: HeroId) =>
      all.filter((h) => h.heroId === id).reduce((sum, h) => sum + COPIES_PER_STAR[h.stars], 0)

    player.roster.bench
      .filter((h) => h.stars === 1 && copies(h.heroId) === 1)
      .sort((a, b) => heroPower(a) - heroPower(b))
      .slice(0, excess)
      .forEach((h) => player.sell(h.uid))
  }

  /** Buys at most one item per turn for the strongest hero on the map that still has a free slot. */
  private outfit(player: Player, { round }: CoachContext) {
    const carrier = [...player.roster.boardHeroes()]
      .filter((h) => h.items.length < ITEM_SLOTS)
      .sort((a, b) => heroPower(b) - heroPower(a))[0]

    if (!carrier) {
      return
    }

    if (player.stash.items.length) {
      player.equip(0, carrier.uid)

      return
    }

    if (round < this.options.itemsFromRound) {
      return
    }

    const budget = player.wallet.gold - this.options.goldReserveForItems

    const wanted = ITEM_WISHLIST[HEROES[carrier.heroId].role].find(
      (item) => ITEMS[item].cost <= budget && !carrier.items.includes(item),
    )

    if (wanted && player.buyItem(wanted).isOk()) {
      player.equip(player.stash.items.length - 1, carrier.uid)
    }
  }
}
