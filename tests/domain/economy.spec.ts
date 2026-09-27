import { describe, expect, it } from 'vitest'
import { HEROES } from '@/content/heroes'
import { HERO_IDS } from '@/content/ids'
import { COPIES_PER_STAR, ECONOMY, POOL_COPIES } from '@/content/rules'
import { sequentialIds } from '@/core/ids'
import { createRng } from '@/core/random/rng'
import { HeroPool } from '@/domain/economy/HeroPool'
import { computeIncome } from '@/domain/economy/income'
import { Player } from '@/domain/player/Player'
import { freshStructures } from '@/domain/match/structures'

const totalInPool = (pool: HeroPool) => HERO_IDS.reduce((sum, id) => sum + pool.available(id), 0)
const initialTotal = HERO_IDS.reduce((sum, id) => sum + POOL_COPIES[HEROES[id].tier], 0)

describe('shop and pool', () => {
  it('conserves hero copies across rerolls, purchases and sales', () => {
    const pool = new HeroPool()
    const player = new Player(0, { pool, rng: createRng('pool'), ids: sequentialIds() })
    player.wallet.earn(100)
    player.shop.restock(player.level)
    for (let i = 0; i < 10; i++) player.reroll()
    const purchase = player.buy(player.shop.slots.findIndex((id) => id !== null))._unsafeUnwrap()

    const offered = player.shop.slots.filter((id) => id !== null).length
    const owned = player.roster.all().reduce((sum, h) => sum + COPIES_PER_STAR[h.stars], 0)
    expect(totalInPool(pool) + offered + owned).toBe(initialTotal)

    player.sell(purchase.hero.uid)
    expect(totalInPool(pool) + offered).toBe(initialTotal)
  })

  it('refuses purchases the player cannot afford', () => {
    const player = new Player(0, { pool: new HeroPool(), rng: createRng('poor'), ids: sequentialIds() })
    player.shop.restock(player.level)
    player.wallet.spend(player.wallet.gold)
    expect(player.buy(0)._unsafeUnwrapErr().code).toBe('notEnoughGold')
  })
})

describe('income', () => {
  it('adds interest, farm and a win bonus', () => {
    const stats = { heroKills: 2, creepKills: 17, structureDamage: freshStructures() }
    const income = computeIncome(27, stats, true)
    expect(income).toEqual({
      base: ECONOMY.baseIncome,
      interest: 2,
      farm: 4,
      win: 1,
      total: ECONOMY.baseIncome + 7,
    })
  })

  it('caps interest and farm', () => {
    const stats = { heroKills: 20, creepKills: 200, structureDamage: freshStructures() }
    const income = computeIncome(500, stats, false)
    expect(income.interest).toBe(ECONOMY.maxInterest)
    expect(income.farm).toBe(ECONOMY.maxFarmIncome)
  })
})
