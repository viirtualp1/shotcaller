import { describe, expect, it } from 'vitest'
import { createMatch } from '@/application/createMatch'
import { toMatchView } from '@/application/views'
import { SHOP_ITEM_IDS } from '@/content/ids'
import { ITEMS, STASH_SIZE, upgradeOf } from '@/content/items'
import { sequentialIds } from '@/core/ids'
import { createRng } from '@/core/random/rng'
import { HeroPool } from '@/domain/economy/HeroPool'
import { itemSellValue, Player } from '@/domain/player/Player'

function richPlayer() {
  const player = new Player(0, {
    pool: new HeroPool(),
    rng: createRng('items'),
    ids: sequentialIds(),
    mode: 'threeLanes',
  })

  player.wallet.earn(200)
  player.restockShop()

  return player
}

describe('items', () => {
  it('buys an item into the stash and equips it on a hero', () => {
    const player = richPlayer()
    const { hero } = player.buy(0)._unsafeUnwrap()
    const gold = player.wallet.gold

    expect(player.buyItem('broadsword').isOk()).toBe(true)
    expect(player.wallet.gold).toBe(gold - ITEMS.broadsword.cost)
    expect(player.equip(0, hero.uid).isOk()).toBe(true)

    expect(hero.items).toEqual(['broadsword'])
    expect(player.stash.items).toEqual([])
  })

  it('limits items per hero and stash size', () => {
    const player = richPlayer()
    const { hero } = player.buy(0)._unsafeUnwrap()
    const [first, second, third, ...rest] = SHOP_ITEM_IDS
    for (const item of [first, second]) {
      player.buyItem(item)
      player.equip(0, hero.uid)
    }

    player.buyItem(third)
    expect(player.equip(0, hero.uid)._unsafeUnwrapErr().code).toBe('itemSlotsFull')

    for (const item of rest.slice(0, STASH_SIZE - player.stash.items.length)) {
      player.buyItem(item)
    }

    expect(player.buyItem(rest.at(-1)!)._unsafeUnwrapErr().code).toBe('stashFull')
  })

  it('merges two copies in the stash into the upgrade, worth both of them', () => {
    const player = richPlayer()
    const gold = player.wallet.gold

    expect(player.buyItem('gloves')._unsafeUnwrap()).toBeNull()
    expect(player.buyItem('gloves')._unsafeUnwrap()).toBe('gloves+')
    expect(player.stash.items).toEqual(['gloves+'])
    expect(ITEMS['gloves+'].cost).toBe(ITEMS.gloves.cost * 2)
    expect(player.wallet.gold).toBe(gold - ITEMS['gloves+'].cost)

    expect(player.buyItem('gloves')._unsafeUnwrap()).toBeNull()
    expect(player.stash.items).toEqual(['gloves+', 'gloves'])
  })

  it('takes a copy into a full stash by merging it', () => {
    const player = richPlayer()
    for (const item of SHOP_ITEM_IDS.slice(0, STASH_SIZE)) {
      player.buyItem(item)
    }

    expect(player.buyItem(SHOP_ITEM_IDS[0])._unsafeUnwrap()).toBe(`${SHOP_ITEM_IDS[0]}+`)
    expect(player.stash.items).toHaveLength(STASH_SIZE)
  })

  it('upgrades the item a hero carries in place, even with both slots taken', () => {
    const player = richPlayer()
    const { hero } = player.buy(0)._unsafeUnwrap()
    for (const item of ['staff', 'boots'] as const) {
      player.buyItem(item)
      player.equip(0, hero.uid)
    }

    player.buyItem('staff')
    expect(player.equip(0, hero.uid)._unsafeUnwrap()).toBe('staff+')
    expect(hero.items).toEqual(['staff+', 'boots'])

    player.buyItem('staff')
    expect(player.equip(0, hero.uid)._unsafeUnwrapErr().code).toBe('itemSlotsFull')
  })

  it('never sells an upgrade in the shop', () => {
    expect(richPlayer().buyItem('aegis+')._unsafeUnwrapErr().code).toBe('itemNotFound')
  })

  it('changes at least one number of every item it upgrades', () => {
    for (const id of SHOP_ITEM_IDS) {
      const plain = ITEMS[id]
      const upgrade = ITEMS[upgradeOf(id)]

      const changes = [
        ...Object.entries(upgrade.modifiers).map(([key, value]) => [
          value,
          plain.modifiers[key as never] as number,
        ]),
        ...Object.entries(upgrade.effects).map(([key, value]) => [
          value,
          plain.effects[key as never] as number,
        ]),
      ].filter(([after, before]) => after !== before)

      expect(changes.length, id).toBeGreaterThan(0)
    }
  })

  it('returns items to the stash when the hero is sold or an item is taken off', () => {
    const player = richPlayer()
    const { hero } = player.buy(0)._unsafeUnwrap()
    player.buyItem('chainmail')
    player.buyItem('staff')
    player.equip(0, hero.uid)
    player.equip(0, hero.uid)

    player.unequip(hero.uid, 0)
    expect(player.stash.items).toEqual(['chainmail'])

    player.sell(hero.uid)
    expect(player.stash.items).toEqual(['chainmail', 'staff'])
  })

  it('sells stash items for half their cost', () => {
    const player = richPlayer()
    player.buyItem('aegis')
    const gold = player.wallet.gold
    expect(player.sellItem(0)._unsafeUnwrap()).toBe(itemSellValue('aegis'))
    expect(player.wallet.gold).toBe(gold + Math.floor(ITEMS.aegis.cost / 2))
  })

  it('tells the shop where a second copy would forge the upgrade', () => {
    const match = createMatch({ seed: 'forge-offers' })
    const player = match.human
    const offer = (id: string) => toMatchView(match).human.itemShop.find((o) => o.itemId === id)!

    player.wallet.earn(200)

    expect(offer('gloves')).toMatchObject({
      ownedCopies: 0,
      forge: null,
    })

    player.buyItem('gloves')._unsafeUnwrap()

    expect(offer('gloves')).toMatchObject({
      ownedCopies: 1,
      forge: 'buy',
    })

    const { hero } = player.buy(0)._unsafeUnwrap()
    player.equip(0, hero.uid)._unsafeUnwrap()

    expect(offer('gloves')).toMatchObject({
      ownedCopies: 1,
      forge: 'equip',
    })

    player.buyItem('gloves')._unsafeUnwrap()
    player.equip(0, hero.uid)._unsafeUnwrap()
    expect(hero.items).toEqual([upgradeOf('gloves')])

    expect(offer('gloves')).toMatchObject({
      ownedCopies: 2,
      forge: null,
    })
  })
})
