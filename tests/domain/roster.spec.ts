import { describe, expect, it } from 'vitest'
import type { HeroId } from '@/content/ids'
import { sequentialIds } from '@/core/ids'
import { promoteDuplicates, wouldPromote } from '@/domain/roster/promotion'
import { Roster, type OwnedHero } from '@/domain/roster/Roster'

const ids = sequentialIds('hero')

const hero = (heroId: HeroId, stars: OwnedHero['stars'] = 1) => ({
  uid: ids(),
  heroId,
  stars,
  items: [],
})

describe('Roster', () => {
  it('limits the board to the coach capacity', () => {
    const roster = new Roster(8)

    const [a, b, c] = [hero('archer'), hero('giant'), hero('sapper')]

    ;[a, b, c].forEach((h) => roster.add(h))
    expect(roster.move(a.uid, 'mid', 2).isOk()).toBe(true)
    expect(roster.move(b.uid, 'top', 2).isOk()).toBe(true)
    const blocked = roster.move(c.uid, 'bot', 2)
    expect(blocked._unsafeUnwrapErr()).toEqual({
      code: 'boardFull',
      capacity: 2,
    })
  })

  it('allows moving between lanes when the board is full', () => {
    const roster = new Roster(8)
    const a = hero('archer')
    roster.add(a)
    roster.move(a.uid, 'mid', 1)
    expect(roster.move(a.uid, 'top', 1).isOk()).toBe(true)
    expect(roster.lane('top')).toEqual([a])
  })

  it('swaps a bench hero with a lane hero', () => {
    const roster = new Roster(8)
    const [a, b] = [hero('archer'), hero('giant')]
    roster.add(a)
    roster.add(b)
    roster.move(a.uid, 'bot', 5)
    roster.swap(a.uid, b.uid)
    expect(roster.lane('bot')).toEqual([b])
    expect(roster.bench).toEqual([a])
  })
})

describe('promotion', () => {
  it('merges three copies into a two-star hero and keeps the board copy', () => {
    const roster = new Roster(8)
    const onBoard = hero('blademaster')
    roster.add(onBoard)
    roster.move(onBoard.uid, 'mid', 5)
    roster.add(hero('blademaster'))
    roster.add(hero('blademaster'))

    const promoted = promoteDuplicates(roster)

    expect(promoted.promoted).toEqual([onBoard])
    expect(onBoard.stars).toBe(2)
    expect(roster.all()).toHaveLength(1)
    expect(roster.lane('mid')).toEqual([onBoard])
  })

  it('chains promotions up to three stars', () => {
    const roster = new Roster(12)
    for (let i = 0; i < 2; i++) {
      roster.add(hero('pyromancer', 2))
    }

    for (let i = 0; i < 3; i++) {
      roster.add(hero('pyromancer'))
    }

    promoteDuplicates(roster)

    expect(roster.all().map((h) => h.stars)).toEqual([3])
  })

  it('moves items from consumed copies onto the promoted hero and frees the overflow', () => {
    const roster = new Roster(8)

    const keeper: OwnedHero = {
      uid: 'k',
      heroId: 'archer',
      stars: 1,
      items: ['broadsword'],
    }

    roster.add(keeper)

    roster.add({
      uid: 'a',
      heroId: 'archer',
      stars: 1,
      items: ['gloves', 'boots'],
    })

    roster.add({
      uid: 'b',
      heroId: 'archer',
      stars: 1,
      items: ['staff'],
    })

    const { freedItems } = promoteDuplicates(roster)

    expect(keeper.items).toEqual(['broadsword', 'gloves'])
    expect(freedItems).toEqual(['boots', 'staff'])
  })

  it('knows when a purchase would complete a set', () => {
    const roster = new Roster(8)
    roster.add(hero('acolyte'))
    expect(wouldPromote(roster, 'acolyte')).toBe(false)
    roster.add(hero('acolyte'))
    expect(wouldPromote(roster, 'acolyte')).toBe(true)
  })
})
