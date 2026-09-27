import type { System } from 'check2d'
import { World } from 'miniplex'
import { describe, expect, it } from 'vitest'
import { createRng } from '@/core/random/rng'
import type { Entity } from '@/simulation/ecs/components'
import { createQueries } from '@/simulation/ecs/queries'
import { SpatialIndex } from '@/simulation/services/SpatialIndex'

/** Tight clusters of mixed sizes, some bodies static and some sharing a centre exactly. */
function crowd(seed: string) {
  const world = new World<Entity>()
  const rng = createRng(seed)
  for (let i = 0; i < 120; i++) {
    const cx = 200 + Math.floor(rng.next() * 4) * 150
    const cy = 300
    const stacked = i % 17 === 0

    world.add({
      team: i % 2 === 0 ? 0 : 1,
      kind: 'creep',
      position: {
        x: stacked ? cx : cx + rng.range(-40, 40),
        y: stacked ? cy : cy + rng.range(-40, 40),
      },
      radius: rng.range(6, 24),
      health: {
        current: 1,
        max: 1,
      },
      armor: 0,
      status: {
        stun: 0,
        root: 0,
        slow: 0,
        slowFactor: 0,
      },
      ...(i % 9 === 0 ? {} : { speed: 60 }),
    })
  }

  const { units } = createQueries(world)
  return {
    index: new SpatialIndex(units),
    units,
  }
}

const bodies = (units: ReturnType<typeof crowd>['units']) => units.entities.map((u) => [u.body!.x, u.body!.y])

describe('SpatialIndex', () => {
  it('separates bodies exactly like check2d does', () => {
    const ours = crowd('separate')
    const reference = crowd('separate')
    // The same crowd, pushed apart by check2d's own general-purpose System.separate().
    const check2d = (reference.index as unknown as { system: System }).system
    const start = bodies(ours.units)

    for (let pass = 0; pass < 5; pass++) {
      ours.index.separate()
      check2d.separate()
      expect(bodies(ours.units)).toEqual(bodies(reference.units))
    }

    expect(bodies(ours.units)).not.toEqual(start)
  })
})
