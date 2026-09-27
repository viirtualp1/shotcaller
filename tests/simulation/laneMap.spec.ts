import { describe, expect, it } from 'vitest'
import { createRng } from '@/core/random/rng'
import { LaneMap } from '@/simulation/map/LaneMap'

describe('LaneMap', () => {
  it('tells whether a point is near a path exactly as a full projection does', () => {
    const map = new LaneMap()
    const rng = createRng('lane-band')
    const mismatches: string[] = []

    for (const path of map.allPaths()) {
      const points = [
        ...path.points,
        ...Array.from({ length: 2000 }, () => ({
          x: rng.range(0, 1000),
          y: rng.range(0, 1000),
        })),
      ]

      for (const p of points) {
        for (const maxDistance of [0, 20, 95, 300]) {
          if (map.isWithin(path, p, maxDistance) !== map.project(path, p).distance <= maxDistance) {
            mismatches.push(`${path.lane} (${p.x}, ${p.y}) within ${maxDistance}`)
          }
        }
      }
    }

    expect(mismatches).toEqual([])
  })
})
