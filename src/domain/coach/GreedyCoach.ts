import { HEROES } from '@/content/heroes'
import type { HeroId, ItemId, RoleId } from '@/content/ids'
import { isShopItem, recipeOf, RECIPES, ITEM_SLOTS, ITEMS } from '@/content/items'
import { COPIES_PER_STAR, ECONOMY, OPPONENT, type OpponentStyle } from '@/content/rules'
import { SYNERGIES } from '@/content/synergies'
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

/** Lane synergies a hero of this role would switch on next to the roles already owned; mode and lane aside. */
function synergiesCompleted(owned: readonly RoleId[], role: RoleId) {
  return SYNERGIES.filter((synergy) => {
    const lane = (roles: readonly RoleId[]) => ({
      mode: 'twoLanes' as const,
      lane: 'top' as const,
      roles,
    })

    return (
      synergy.id !== 'trilane' && !synergy.isActive(lane(owned)) && synergy.isActive(lane([...owned, role]))
    )
  }).length
}

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
    if (this.options.bonusGold) {
      player.wallet.earn(this.options.bonusGold)
    }

    /* Reserve one item before shopping can spend the whole round's income on heroes and rerolls. */
    this.combineItems(player)
    const itemBought = this.completeRecipe(player, context) || this.outfit(player, context)
    this.combineItems(player)
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

    const ownedRoles = owned.map((h) => HEROES[h.heroId].role)
    const roles = new Set(ownedRoles)

    /* A hero of a faction already owned can share a lane with it; the first pair matters most. */
    const kin = (id: HeroId) =>
      Math.min(owned.filter((h) => HEROES[h.heroId].faction === HEROES[id].faction).length, 2)

    const score = (id: HeroId) =>
      HEROES[id].tier * 2 +
      (roles.has(HEROES[id].role) ? 0 : 1.5) +
      this.options.synergyWeight * (synergiesCompleted(ownedRoles, HEROES[id].role) + kin(id) / 2) +
      rng.next()

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

  private combineItems(player: Player) {
    for (const hero of player.roster.all()) {
      if (hero.items.length === 2 && recipeOf(hero.items[0]!, hero.items[1]!)) {
        player.combine(
          {
            uid: hero.uid,
            index: 1,
          },
          {
            uid: hero.uid,
            index: 0,
          },
        )
      }

      for (let i = player.stash.items.length - 1; i >= 0; i--) {
        const target = hero.items.findIndex((item) => recipeOf(item, player.stash.items[i]!) !== null)
        if (target >= 0) {
          player.combine(
            { index: i },
            {
              uid: hero.uid,
              index: target,
            },
          )
        }
      }
    }

    for (let i = player.stash.items.length - 1; i > 0; i--) {
      const target = player.stash.items.findIndex(
        (item, j) => j < i && recipeOf(item, player.stash.items[i]!) !== null,
      )

      if (target >= 0) {
        player.combine({ index: i }, { index: target })
      }
    }
  }

  private completeRecipe(player: Player, { round }: CoachContext) {
    if (round < this.options.itemsFromRound || player.stash.items.length) {
      return false
    }

    const budget = player.wallet.gold - this.options.goldReserveForItems
    for (const hero of [...player.roster.boardHeroes()].sort((a, b) => heroPower(b) - heroPower(a))) {
      const wishlist = ITEM_WISHLIST[HEROES[hero.heroId].role]
      for (const recipe of RECIPES) {
        const owned = hero.items.findIndex((item) => item === recipe.a || item === recipe.b)
        if (owned < 0 || !wishlist.includes(recipe.a) || !wishlist.includes(recipe.b)) {
          continue
        }

        const missing = hero.items[owned] === recipe.a ? recipe.b : recipe.a
        if (ITEMS[missing].cost <= budget && player.buyItem(missing).isOk()) {
          player.combine(
            { index: player.stash.items.length - 1 },
            {
              uid: hero.uid,
              index: owned,
            },
          )

          return true
        }
      }
    }

    return false
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
      const plain = hero.items.find((item) => isShopItem(item) && ITEMS[item].cost <= budget)
      if (plain && player.buyItem(plain).isOk()) {
        player.equip(player.stash.items.length - 1, hero.uid)

        return true
      }
    }

    return false
  }
}
