import { HEROES } from '@/content/heroes'
import { ROLE_IDS, type HeroId, type LaneId, type ModeId, type RoleId, type SynergyId } from '@/content/ids'
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
  /** The role each hero fights in, in lineup order; adaptive heroes have already picked theirs. */
  readonly roles: readonly RoleId[]
  readonly synergies: readonly SynergyId[]
  readonly suggestions: readonly SynergySuggestion[]
  synergyModifiersFor(role: RoleId): StatModifiers
  modifiersFor(role: RoleId): StatModifiers
}

const activeSynergies = (lane: LaneId, roles: readonly RoleId[], mode: ModeId) =>
  SYNERGIES.filter((s) =>
    s.isActive({
      mode,
      lane,
      roles,
    }),
  )

/**
 * Adaptive heroes, in lineup order, take the role that switches on the most synergies of the lane. A tie keeps
 * the hero's own role, then goes to the first role in the usual order, so the choice never surprises a coach.
 */
export function laneRoles(lane: LaneId, heroIds: readonly HeroId[], mode: ModeId) {
  const roles = heroIds.map((id) => HEROES[id].role)
  heroIds.forEach((id, index) => {
    const hero = HEROES[id]
    if (!hero.adaptive) {
      return
    }

    const countWith = (role: RoleId) =>
      activeSynergies(
        lane,
        roles.map((r, i) => (i === index ? role : r)),
        mode,
      ).length

    let best = hero.role
    let bestCount = countWith(best)
    for (const role of ROLE_IDS) {
      const count = countWith(role)
      if (count > bestCount) {
        best = role
        bestCount = count
      }
    }

    roles[index] = best
  })

  return roles
}

export function resolveLane(lane: LaneId, heroIds: readonly HeroId[], mode: ModeId): LaneReport {
  const roles = laneRoles(lane, heroIds, mode)
  const active = activeSynergies(lane, roles, mode)

  const suggestions = SYNERGIES.filter((s) => !active.includes(s))
    .map((s) => ({
      synergy: s.id,
      roles: ROLE_IDS.filter((role) =>
        s.isActive({
          mode,
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
    roles,
    synergies: active.map((s) => s.id),
    suggestions,
    synergyModifiersFor,
    modifiersFor: (role) => combineModifiers(ROLES[role].modifiers, synergyModifiersFor(role)),
  }
}
