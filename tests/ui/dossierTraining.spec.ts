// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useMatchStore } from '@/ui/stores/match'
import type { HeroBuild } from '@/domain/profile/dossier'

const build: HeroBuild = {
  heroId: 'giant',
  appearances: 3,
  wins: 2,
  stars: 3,
  lane: 'top',
  lanes: [
    {
      lane: 'top',
      count: 3,
    },
  ],
  items: [],
  loadout: ['broadsword+', 'chainmail'],
}

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
})

describe('training a scouted build', () => {
  it('recruits the exact stars and gear for free and uses an available lane', () => {
    const match = useMatchStore()
    expect(match.tryBuild('oneLane', build)).toBe(true)
    const hero = match.view!.human.lanes.mid.heroes[0]!
    expect(hero.heroId).toBe('giant')
    expect(hero.stars).toBe(3)
    expect(hero.items).toEqual(['broadsword+', 'chainmail'])
    expect(match.view!.sandbox).toBeTruthy()
    expect(match.view!.human.bench).toHaveLength(0)
  })

  it('rebuilds crafted items from their components', () => {
    const match = useMatchStore()
    expect(
      match.tryBuild('oneLane', {
        ...build,
        loadout: ['echoStaff', 'tempestBlade'],
      }),
    ).toBe(true)

    expect(match.view!.human.lanes.mid.heroes[0]!.items).toEqual(['echoStaff', 'tempestBlade'])
  })

  it('keeps an active match when training is requested', () => {
    const match = useMatchStore()
    match.newMatch()
    const before = match.view
    expect(match.tryBuild('oneLane', build)).toBe(false)
    expect(match.view).toBe(before)
  })
})
