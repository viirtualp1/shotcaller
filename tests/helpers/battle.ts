import type { HeroId, ItemId, LaneId, LaneStance, ModeId, StarLevel } from '@/content/ids'
import type { TalentChoice } from '@/content/talents'
import type { LaneStances } from '@/domain/battle/contracts'
import { freshStructures } from '@/domain/match/structures'
import type { OwnedHero } from '@/domain/roster/Roster'
import { BattleSimulation } from '@/simulation/BattleSimulation'
import type { SimulationContext } from '@/simulation/SimulationContext'

export interface HeroSpec {
  readonly uid: string
  readonly heroId: HeroId
  readonly items?: readonly ItemId[]
  readonly souls?: number
  readonly stars?: StarLevel
  readonly talent?: TalentChoice
}

type Side = Partial<Record<LaneId, readonly HeroSpec[]>>

const owned = (spec: HeroSpec): OwnedHero => ({
  uid: spec.uid,
  heroId: spec.heroId,
  stars: spec.stars ?? 1,
  items: [...(spec.items ?? [])],
  ...(spec.souls ? { souls: spec.souls } : {}),
  ...(spec.talent !== undefined ? { talent: spec.talent } : {}),
})

const lineup = (side: Side) => ({
  top: (side.top ?? []).map(owned),
  mid: (side.mid ?? []).map(owned),
  bot: (side.bot ?? []).map(owned),
})

/** A battle set up for a rule under test, with its systems and services reachable for direct calls. */
export function arena({
  ours = {},
  theirs = {},
  stances = {},
  mode = 'threeLanes',
  round = 1,
}: {
  ours?: Side
  theirs?: Side
  stances?: Partial<Record<LaneId, LaneStance>>
  mode?: ModeId
  round?: number
}) {
  const simulation = new BattleSimulation({
    mode,
    round,
    seed: 'arena',
    lineups: [lineup(ours), lineup(theirs)],
    structures: [freshStructures(mode), freshStructures(mode)],
    stances: [stances as LaneStances, {}],
  })

  const ctx = (simulation as unknown as { ctx: SimulationContext }).ctx
  const hero = (uid: string) => simulation.queries.heroes.entities.find((h) => h.hero.uid === uid)!

  const structure = (team: 0 | 1, slot: string) =>
    simulation.queries.structures.entities.find((s) => s.team === team && s.structure.slot === slot)!

  return {
    simulation,
    ctx,
    hero,
    structure,
  }
}
