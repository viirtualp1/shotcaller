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

/** What tells copies of one hero apart: their lanes, or, sharing a lane, their items. */
interface TwinTells {
  readonly lane: boolean
  readonly items: boolean
}

const twinKey = (hero: Fighter) => `${hero.team}:${hero.heroId}:${hero.stars}`

const differ = (values: readonly unknown[]) => new Set(values).size > 1

/**
 * Labels the heroes of one fight in its stats: the hero and its stars. Two copies of a hero at the same stars also
 * get what tells them apart, their lanes or, in one lane, their items. Copies alike in all of that are alike on
 * the map too, so it makes no difference which is which.
 */
export function useFighterLabels(fighters: MaybeRefOrGetter<readonly Fighter[]>) {
  const text = useGameText()

  const tells = computed(() => {
    const twins = new Map<string, Fighter[]>()
    for (const hero of toValue(fighters)) {
      twins.set(twinKey(hero), [...(twins.get(twinKey(hero)) ?? []), hero])
    }

    const result = new Map<string, TwinTells>()

    for (const [key, group] of twins) {
      if (group.length < 2) {
        continue
      }

      const lane = differ(group.map((hero) => hero.lane))

      result.set(key, {
        lane,
        items: !lane && differ(group.map((hero) => (hero.items ?? []).join())),
      })
    }

    return result
  })

  return (hero: Fighter) => {
    const tell = tells.value.get(twinKey(hero))
    const name = `${text.heroName(hero.heroId)} ${starsLabel(hero.stars)}`

    return {
      name: tell?.lane && hero.lane ? `${name} · ${text.slotName(hero.lane)}` : name,
      items: tell?.items ? (hero.items ?? []) : [],
    }
  }
}
