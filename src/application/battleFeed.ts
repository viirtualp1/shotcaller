import type { HeroId, StructureSlot, TeamId } from '@/content/ids'
import type { UnitKind } from '@/simulation/ecs/components'
import type { SimulationEmitter, SimulationEvents } from '@/simulation/events'

export type FeedEntry =
  | {
      readonly id: number
      readonly kind: 'kill'
      readonly killerTeam: TeamId
      readonly killerHero: HeroId | null
      readonly killerKind: UnitKind
      readonly victim: HeroId
    }
  | {
      readonly id: number
      readonly kind: 'structure'
      readonly attackerTeam: TeamId
      readonly slot: StructureSlot
    }

export function subscribeFeed(events: SimulationEmitter, push: (entry: FeedEntry) => void): () => void {
  let id = 0
  const onKill = ({ victim, killer, creditedHero }: SimulationEvents['heroKilled']) =>
    push({
      id: ++id,
      kind: 'kill',
      killerTeam: killer.team,
      killerHero: creditedHero?.hero.heroId ?? null,
      killerKind: killer.kind ?? 'creep',
      victim: victim.hero.heroId,
    })
  const onStructure = ({ structure, attackerTeam }: SimulationEvents['structureDestroyed']) =>
    push({ id: ++id, kind: 'structure', attackerTeam, slot: structure.structure?.lane ?? 'throne' })
  events.on('heroKilled', onKill)
  events.on('structureDestroyed', onStructure)
  return () => {
    events.off('heroKilled', onKill)
    events.off('structureDestroyed', onStructure)
  }
}
