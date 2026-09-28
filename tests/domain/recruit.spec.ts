import { describe, expect, it } from 'vitest'
import { HEROES } from '@/content/heroes'
import { HERO_IDS, type HeroId, type RoleId } from '@/content/ids'
import { sequentialIds } from '@/core/ids'
import { findRecruit } from '@/domain/coach/recruit'
import { Roster } from '@/domain/roster/Roster'

const ids = sequentialIds('hero')

const hero = (heroId: HeroId) => ({
  uid: ids(),
  heroId,
  stars: 1 as const,
  items: [],
})

const heroWithRole = (role: RoleId) => HERO_IDS.find((id) => HEROES[id].role === role)!

describe('findRecruit', () => {
  it('sends a matching hero from the bench while the board has room', () => {
    const roster = new Roster(8)
    const mage = hero(heroWithRole('mage'))
    roster.add(hero(heroWithRole('carry')))
    roster.add(mage)

    expect(findRecruit(roster, 3, 'top', ['mage'], 'threeLanes')?.uid).toBe(mage.uid)
  })

  it('leaves the bench alone when the board is full', () => {
    const roster = new Roster(8)
    const mage = hero(heroWithRole('mage'))
    roster.add(mage)

    expect(findRecruit(roster, 0, 'top', ['mage'], 'threeLanes')).toBeNull()
  })

  it('borrows a hero from another lane when the board is full', () => {
    const roster = new Roster(8)
    const mage = hero(heroWithRole('mage'))
    roster.add(mage)
    roster.move(mage.uid, 'bot', 1)

    expect(findRecruit(roster, 1, 'top', ['mage'], 'threeLanes')?.uid).toBe(mage.uid)
  })

  it('finds nobody without a hero of the needed role', () => {
    const roster = new Roster(8)
    roster.add(hero(heroWithRole('carry')))

    expect(findRecruit(roster, 3, 'top', ['support'], 'threeLanes')).toBeNull()
  })
})
