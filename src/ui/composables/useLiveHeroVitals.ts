import { computed } from 'vue'
import { heroVitals } from '@/application/heroVitals'
import { useMatchStore } from '../stores/match'

/** The live view invalidates this snapshot even though simulation entities themselves are not reactive. */
export function useLiveHeroVitals(uid: () => string | null) {
  const store = useMatchStore()

  return computed(() => {
    const id = uid()
    const simulation = store.simulation
    if (!id || !simulation || !store.live?.heroes.has(id)) {
      return null
    }

    const hero = simulation.queries.heroes.entities.find((unit) => unit.hero.uid === id)
    return hero ? heroVitals(hero, simulation.queries.auras.entities) : null
  })
}
