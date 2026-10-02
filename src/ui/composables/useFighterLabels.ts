import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import type { HeroId, ItemId, LaneId, StarLevel, TeamId } from '@/content/ids'
import { starsLabel, useGameText } from './useGameText'

interface Fighter {
  readonly uid: string
  readonly team: TeamId
  readonly heroId: HeroId
  readonly stars: StarLevel
  readonly lane?: LaneId
  readonly items?: readonly ItemId[]
}

const twinKey = (hero: Fighter) => `${hero.team}:${hero.heroId}:${hero.stars}`

const differ = (values: readonly unknown[]) => new Set(values).size > 1

/**
 * Labels the heroes of one fight in its stats: the hero, its stars and the items it fought with. Two copies of a hero
 * at the same stars on different lanes also get their lane. Copies alike in all of that are alike on the map too, so
 * it makes no difference which is which.
 */
export function useFighterLabels(
  fighters: MaybeRefOrGetter<readonly Fighter[]>,
  /** Lanes shown on every row already, so twins on different lanes need nothing more. */
  laneShown: MaybeRefOrGetter<boolean> = false,
) {
  const text = useGameText()

  const tells = computed(() => {
    const twins = new Map<string, Fighter[]>()
    for (const hero of toValue(fighters)) {
      twins.set(twinKey(hero), [...(twins.get(twinKey(hero)) ?? []), hero])
    }

    /* Copies of one hero on different lanes are told apart by their lane; their items show either way. */
    const result = new Set<string>()

    for (const [key, group] of twins) {
      if (group.length > 1 && differ(group.map((hero) => hero.lane))) {
        result.add(key)
      }
    }

    return result
  })

  return (hero: Fighter) => {
    const tell = tells.value.has(twinKey(hero))
    const name = `${text.heroName(hero.heroId)} ${starsLabel(hero.stars)}`

    return {
      name: tell && hero.lane && !toValue(laneShown) ? `${name} · ${text.slotName(hero.lane)}` : name,
      items: hero.items ?? [],
    }
  }
}
