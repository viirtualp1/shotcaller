import { describe, expect, it } from 'vitest'
import { ITEMS, ITEM_SLOTS, STASH_SIZE } from '@/content/items'
import { sequentialIds } from '@/core/ids'
import { createRng } from '@/core/random/rng'
import { HeroPool } from '@/domain/economy/HeroPool'
import { itemSellValue, Player } from '@/domain/player/Player'

function richPlayer() {
  const player = new Player(0, { pool: new HeroPool(), rng: createRng('items'), ids: sequentialIds() })
  player.wallet.earn(200)
  player.shop.restock(player.level)
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
    for (let i = 0; i < ITEM_SLOTS; i++) {
      player.buyItem('boots')
      player.equip(0, hero.uid)
    }
    player.buyItem('boots')
    expect(player.equip(0, hero.uid)._unsafeUnwrapErr().code).toBe('itemSlotsFull')

    for (let i = player.stash.items.length; i < STASH_SIZE; i++) player.buyItem('boots')
    expect(player.buyItem('boots')._unsafeUnwrapErr().code).toBe('stashFull')
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
})
