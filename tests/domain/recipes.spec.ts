import { describe, expect, it } from 'vitest'
import { createMatch } from '@/application/createMatch'
import { toMatchView } from '@/application/views'
import { ITEMS, RECIPES, recipeOf } from '@/content/items'
import { createRng } from '@/core/random/rng'
import { GreedyCoach } from '@/domain/coach/GreedyCoach'
import { heroPower } from '@/domain/coach/LaneOptimizer'
import { affordableBoard, boardValue } from '@/domain/player/boardValue'
import { itemSellValue } from '@/domain/player/Player'

function setup() {
  const match = createMatch({
    seed: 'recipes',
    mode: 'threeLanes',
  })

  match.human.wallet.earn(100)

  return match
}

describe('explicit recipes', () => {
  it.each(RECIPES)('crafts $result in either order without changing its board value', ({ a, b, result }) => {
    const player = setup().human
    player.buyItem(a)._unsafeUnwrap()
    player.buyItem(b)._unsafeUnwrap()
    expect(player.stash.items).toEqual([a, b])
    const before = player.snapshot()

    expect(recipeOf(b, a)).toBe(result)
    expect(player.combine({ index: 1 }, { index: 0 })._unsafeUnwrap()).toBe(result)
    expect(player.stash.items).toEqual([result])
    expect(boardValue(player.snapshot())).toBe(boardValue(before))
    expect(affordableBoard(player.snapshot(), before, 'threeLanes', 1)).toBe(true)
    expect(ITEMS[result].cost).toBe(ITEMS[a].cost + ITEMS[b].cost)
    expect(player.sellItem(0)._unsafeUnwrap()).toBe(itemSellValue(a) + itemSellValue(b))
    expect(player.buyItem(result).isErr()).toBe(true)
  })

  it('keeps the result in the target slot even when the source is earlier in the same inventory', () => {
    const player = setup().human
    player.stash.restore(['staff', 'boots', 'manaStone'])
    player.combine({ index: 0 }, { index: 2 })._unsafeUnwrap()
    expect(player.stash.items).toEqual(['boots', 'echoStaff'])
  })

  it('crafts on a full hero and between heroes without needing a stash slot', () => {
    const player = setup().human
    const a = player.buy(0)._unsafeUnwrap().hero
    const b = player.buy(1)._unsafeUnwrap().hero
    a.items = ['broadsword', 'boots']
    b.items = ['gloves']
    player.stash.restore(['staff', 'manaStone', 'chainmail', 'vitality', 'aegis', 'chalice'])
    const before = boardValue(player.snapshot())
    player
      .combine(
        {
          uid: b.uid,
          index: 0,
        },
        {
          uid: a.uid,
          index: 0,
        },
      )
      ._unsafeUnwrap()

    expect(a.items).toEqual(['tempestBlade', 'boots'])
    expect(b.items).toEqual([])
    expect(boardValue(player.snapshot())).toBe(before)
  })

  it('rejects stale confirmations, invalid pairs and self-combination atomically', () => {
    const player = setup().human
    player.stash.restore(['broadsword', 'gloves', 'staff+'])
    const before = player.snapshot()
    for (const target of [0, 2, 99, -1]) {
      expect(player.combine({ index: 0 }, { index: target }).isErr()).toBe(true)
    }

    expect(player.combine({ index: 0 }, { index: 1 }, ['staff', 'manaStone']).isErr()).toBe(true)
    expect(player.snapshot()).toEqual(before)
  })

  it('never forges crafted copies automatically and values both components in the optimizer', () => {
    const player = setup().human
    player.stash.put('tempestBlade')
    player.stash.put('tempestBlade')
    expect(player.stash.items).toEqual(['tempestBlade', 'tempestBlade'])
    const hero = player.buy(0)._unsafeUnwrap().hero
    expect(
      heroPower({
        ...hero,
        items: ['tempestBlade'],
      }),
    ).toBe(
      heroPower({
        ...hero,
        items: ['broadsword', 'gloves'],
      }),
    )
  })

  it('shows available recipe partners from both heroes and the stash', () => {
    const match = setup()
    const player = match.human
    player.buyItem('gloves')
    const offer = () => toMatchView(match).human.itemShop.find((item) => item.itemId === 'broadsword')!
    expect(offer().recipes).toEqual(['tempestBlade'])
    player.equip(0, player.buy(0)._unsafeUnwrap().hero.uid)
    expect(offer().recipes).toEqual(['tempestBlade'])
  })

  it('lets the coach finish an existing recipe during planning', () => {
    const player = setup().human
    const hero = player.buy(0)._unsafeUnwrap().hero
    player.move(hero.uid, 'top')
    hero.items = ['broadsword', 'gloves']

    new GreedyCoach().playTurn(player, {
      round: 1,
      rng: createRng('recipe-coach'),
    })

    expect(hero.items).toContain('tempestBlade')
  })
})
