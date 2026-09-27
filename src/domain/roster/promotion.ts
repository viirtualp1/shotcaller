import type { HeroId, ItemId, StarLevel } from '@/content/ids'
import { ITEM_SLOTS } from '@/content/items'
import { MERGE_COUNT } from '@/content/rules'
import type { OwnedHero, Roster } from './Roster'

const MAX_STARS: StarLevel = 3

export interface PromotionResult {
  readonly promoted: readonly OwnedHero[]
  /** Items from consumed copies that did not fit on the promoted hero. */
  readonly freedItems: readonly ItemId[]
}

function findMergeGroup(roster: Roster): OwnedHero[] | undefined {
  const groups = new Map<string, OwnedHero[]>()
  for (const hero of roster.all()) {
    if (hero.stars >= MAX_STARS) continue
    const key = `${hero.heroId}:${hero.stars}`
    const group = groups.get(key) ?? []
    group.push(hero)
    if (group.length === MERGE_COUNT) return group
    groups.set(key, group)
  }
  return undefined
}

export function promoteDuplicates(roster: Roster): PromotionResult {
  const promoted: OwnedHero[] = []
  const freedItems: ItemId[] = []
  for (let group = findMergeGroup(roster); group; group = findMergeGroup(roster)) {
    const [keeper, ...consumed] = group as [OwnedHero, ...OwnedHero[]]
    for (const hero of consumed) {
      roster.remove(hero.uid)
      for (const item of hero.items) {
        if (keeper.items.length < ITEM_SLOTS) keeper.items.push(item)
        else freedItems.push(item)
      }
    }
    keeper.stars = (keeper.stars + 1) as StarLevel
    promoted.push(keeper)
  }
  return { promoted, freedItems }
}

export function wouldPromote(roster: Roster, heroId: HeroId): boolean {
  return roster.all().filter((h) => h.heroId === heroId && h.stars === 1).length >= MERGE_COUNT - 1
}
