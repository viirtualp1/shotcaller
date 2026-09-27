import { HEROES } from '@/content/heroes'
import { ROLE_IDS, type HeroId, type LaneId, type RoleId, type SynergyId } from '@/content/ids'
import { combineModifiers, type StatModifiers } from '@/content/modifiers'
import { ROLES } from '@/content/roles'
import { SYNERGIES } from '@/content/synergies'

export interface SynergySuggestion {
  readonly synergy: SynergyId
  /** Any of these roles would switch the synergy on; all six means "any hero". */
  readonly roles: readonly RoleId[]
}

export interface LaneReport {
  readonly lane: LaneId
  readonly synergies: readonly SynergyId[]
  readonly suggestions: readonly SynergySuggestion[]
  synergyModifiersFor(role: RoleId): StatModifiers
  modifiersFor(role: RoleId): StatModifiers
}

export function resolveLane(lane: LaneId, heroIds: readonly HeroId[]): LaneReport {
  const roles = heroIds.map((id) => HEROES[id].role)

  const active = SYNERGIES.filter((s) =>
    s.isActive({
      lane,
      roles,
    }),
  )

  const suggestions = SYNERGIES.filter((s) => !active.includes(s))
    .map((s) => ({
      synergy: s.id,
      roles: ROLE_IDS.filter((role) =>
        s.isActive({
          lane,
          roles: [...roles, role],
        }),
      ),
    }))
    .filter((s) => s.roles.length > 0)

  const synergyModifiersFor = (role: RoleId) =>
    combineModifiers(
      ...active
        .flatMap((s) => s.effects)
        .filter((e) => e.appliesTo === 'all' || e.appliesTo === role)
        .map((e) => e.modifiers),
    )

  return {
    lane,
    synergies: active.map((s) => s.id),
    suggestions,
    synergyModifiersFor,
    modifiersFor: (role) => combineModifiers(ROLES[role].modifiers, synergyModifiersFor(role)),
  }
}
