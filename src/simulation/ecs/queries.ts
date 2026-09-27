import type { World } from 'miniplex'
import type { Entity } from './components'

export function createQueries(world: World<Entity>) {
  const units = world.with('kind', 'health', 'radius', 'armor', 'status')
  return {
    units: units.without('dead'),
    heroes: units.with('hero', 'mana', 'caster', 'attack', 'targeting', 'speed'),
    structures: units.with('structure'),
    fighters: units.with('attack', 'targeting').without('dead'),
    movers: units.with('speed', 'targeting').without('dead'),
    casters: units.with('caster', 'mana').without('dead'),
    roamers: units.with('roamer').without('dead'),
    auras: units.with('healAura').without('dead'),
    spinners: units.with('spin').without('dead'),
    expiring: units.with('lifetime').without('dead'),
    poisoned: units.with('dot').without('dead'),
    shielded: units.with('shield').without('dead'),
    projectiles: world.with('projectile'),
    zones: world.with('zone'),
  }
}

export type Queries = ReturnType<typeof createQueries>
