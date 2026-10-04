import { HEROES } from '@/content/heroes'
import type { HeroId, ItemId, RoleId } from '@/content/ids'
import { isUpgraded, ITEM_SLOTS, ITEMS } from '@/content/items'
import { COPIES_PER_STAR, ECONOMY, OPPONENT, type OpponentStyle } from '@/content/rules'
import type { Player } from '../player/Player'
import { arrangeStrongestLineup } from './arrange'
import type { CoachContext, CoachStrategy } from './CoachStrategy'
import { heroPower, LaneOptimizer } from './LaneOptimizer'

const ITEM_WISHLIST: Readonly<Record<RoleId, readonly ItemId[]>> = {
  carry: ['broadsword', 'gloves', 'cursedBlade', 'vampireFang'],
  support: ['chalice', 'vitality', 'manaStone'],
  mage: ['staff', 'manaStone', 'echoShard', 'vitality'],
  initiator: ['chainmail', 'vitality', 'echoShard', 'thornMail'],
  pusher: ['gloves', 'broadsword', 'boots'],
  ganker: ['broadsword', 'soulJar', 'vampireFang', 'boots'],
}

const MAX_ACTIONS_PER_TURN = 40

export class GreedyCoach implements CoachStrategy {
  private readonly options: OpponentStyle

  constructor(
    private readonly optimizer = new LaneOptimizer(),
    options: Partial<OpponentStyle> = {},
  ) {
    this.options = {
      ...OPPONENT.standard,
      ...options,
    }
  }

  playTurn(player: Player, context: CoachContext) {
    /* Reserve one item before shopping can spend the whole round's income on heroes and rerolls. */
    const itemBought = this.outfit(player, context)
    const goldFloor = itemBought ? this.options.goldReserveForItems : 0

    let rerolls = 0
    for (let action = 0; action < MAX_ACTIONS_PER_TURN; action++) {
      if (this.buyCopy(player, context, goldFloor)) {
        continue
      }

      if (this.levelUp(player, context, goldFloor)) {
        continue
      }

      if (this.recruit(player, context, goldFloor)) {
        continue
      }

      if (rerolls < this.options.maxRerolls && this.reroll(player, context, goldFloor)) {
        rerolls++
        continue
      }

      break
    }

    this.trimBench(player)
    this.pickTalents(player, context)
    arrangeStrongestLineup(player, this.optimizer, context.rng)
  }

  /** Either talent is a fair pick; the coach flips a coin for each new two-star hero. */
  private pickTalents(player: Player, { rng }: CoachContext) {
    for (const hero of player.roster.all()) {
      if (hero.stars === 2 && hero.talent === undefined) {
        player.chooseTalent(hero.uid, rng.next() < 0.5 ? 0 : 1)
      }
    }
  }

  private buyCopy(player: Player, { round }: CoachContext, goldFloor: number) {
    if (round < this.options.copiesFromRound) {
      return false
    }

    const owned = new Set(player.roster.all().map((h) => h.heroId))

    const slot = player.shop.slots.findIndex(
      (id) => id !== null && owned.has(id) && HEROES[id].tier <= player.wallet.gold - goldFloor,
    )

    return slot >= 0 && player.buy(slot).isOk()
  }

  private levelUp(player: Player, { round }: CoachContext, goldFloor: number) {
    const reserve = Math.max(this.options.goldReserveForXp, goldFloor)
    const affordable = player.wallet.gold >= ECONOMY.xpCost + reserve
    const hasTeam = player.roster.all().length >= player.boardCapacity
    return round >= this.options.levelFromRound && affordable && hasTeam && player.buyXp().isOk()
  }

  private recruit(player: Player, { rng, round }: CoachContext, goldFloor: number) {
    const owned = player.roster.all()
    if (owned.length >= player.boardCapacity + this.options.spareHeroes) {
      return false
    }

    const ownedIds = new Set(owned.map((h) => h.heroId))
    const allowCopies = round >= this.options.copiesFromRound

    const roles = new Set(owned.map((h) => HEROES[h.heroId].role))
    const score = (id: HeroId) => HEROES[id].tier * 2 + (roles.has(HEROES[id].role) ? 0 : 1.5) + rng.next()

    const best = player.shop.slots
      .map((id, slot) => ({
        id,
        slot,
      }))
      .filter(
        (o): o is { id: HeroId; slot: number } =>
          o.id !== null &&
          HEROES[o.id].tier <= player.wallet.gold - goldFloor &&
          (allowCopies || !ownedIds.has(o.id)),
      )
      .sort((a, b) => score(b.id) - score(a.id))[0]

    return best !== undefined && player.buy(best.slot).isOk()
  }

  private reroll(player: Player, { round }: CoachContext, goldFloor: number) {
    const requiredGold = Math.max(this.options.rerollAboveGold, ECONOMY.rerollCost + goldFloor)
    if (round < this.options.rerollFromRound || player.wallet.gold < requiredGold) {
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

  /** Buys at most one item per turn, keeping the gold reserve for its next shop and level purchase. */
  private outfit(player: Player, context: CoachContext) {
    const { round } = context

    const carrier = [...player.roster.boardHeroes()]
      .filter((h) => h.items.length < ITEM_SLOTS)
      .sort((a, b) => heroPower(b) - heroPower(a))[0]

    if (!carrier) {
      return this.upgrade(player, context)
    }

    if (player.stash.items.length) {
      player.equip(0, carrier.uid)

      return false
    }

    if (round < this.options.itemsFromRound) {
      return false
    }

    const budget = player.wallet.gold - this.options.goldReserveForItems

    const wanted = ITEM_WISHLIST[HEROES[carrier.heroId].role].find(
      (item) => ITEMS[item].cost <= budget && !carrier.items.includes(item),
    )

    if (wanted && player.buyItem(wanted).isOk()) {
      player.equip(player.stash.items.length - 1, carrier.uid)

      return true
    }

    return false
  }

  /** With every slot on the board taken, a second copy of an item the strongest hero carries merges into its upgrade. */
  private upgrade(player: Player, { round }: CoachContext) {
    if (round < this.options.itemsFromRound || player.stash.items.length) {
      return false
    }

    const budget = player.wallet.gold - this.options.goldReserveForItems
    for (const hero of [...player.roster.boardHeroes()].sort((a, b) => heroPower(b) - heroPower(a))) {
      const plain = hero.items.find((item) => !isUpgraded(item) && ITEMS[item].cost <= budget)
      if (plain && player.buyItem(plain).isOk()) {
        player.equip(player.stash.items.length - 1, hero.uid)

        return true
      }
    }

    return false
  }
}
