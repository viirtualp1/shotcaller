import { System, type Circle } from 'check2d'
import type { Query } from 'miniplex'
import { distance, type Vec2 } from '@/core/math/vec2'
import type { Unit } from '../ecs/components'

/** Leaves a little visual overlap so crowds look packed rather than rigid. */
const BODY_SCALE = 0.85

export class SpatialIndex {
  private readonly system = new System<Circle<Unit>>()
  private readonly unsubscribe: (() => void)[] = []

  constructor(private readonly units: Query<Unit>) {
    for (const unit of units) {
      this.insert(unit)
    }

    this.unsubscribe.push(
      units.onEntityAdded.subscribe((unit) => this.insert(unit)),
      units.onEntityRemoved.subscribe((unit) => this.remove(unit)),
    )
  }

  /**
   * Moves bodies to their units. Only bodies that actually moved are touched: re-inserting one
   * into the tree is the expensive part, and an untouched body would be left where it is anyway.
   */
  sync() {
    let moved = false
    for (const unit of this.units) {
      const body = unit.body
      if (body && (body.x !== unit.position.x || body.y !== unit.position.y)) {
        body.setPosition(unit.position.x, unit.position.y, false)
        moved = true
      }
    }

    if (moved) {
      this.system.update()
    }
  }

  /**
   * Pushes overlapping bodies apart, exactly as check2d's `System.separate()` does: bodies in tree order,
   * each moved at once by the sum of its overlaps, in the same floating-point steps. Our bodies are plain
   * circles (no offset, trigger, padding or collision group), so the generic collision response check2d
   * builds for every touching pair can be skipped.
   */
  separate() {
    for (const body of this.system.all()) {
      if (body.isStatic) {
        continue
      }

      let pushX = 0
      let pushY = 0
      for (const other of this.system.search(body)) {
        if (other === body) {
          continue
        }

        const dx = other.pos.x - body.pos.x
        const dy = other.pos.y - body.pos.y
        const reach = body.r + other.r
        const dSq = dx * dx + dy * dy
        if (dSq > reach * reach) {
          continue
        }

        const d = Math.sqrt(dSq)
        if (d > 0) {
          const overlap = reach - d
          pushX += (dx / d) * overlap
          pushY += (dy / d) * overlap
        }
      }

      if (pushX || pushY) {
        body.setPosition(body.x - pushX, body.y - pushY)
      }
    }

    for (const unit of this.units) {
      if (!unit.body || unit.body.isStatic) {
        continue
      }

      unit.position.x = unit.body.x
      unit.position.y = unit.body.y
    }
  }

  /**
   * Units reaching within `radius` of `center`. The predicate runs before the distance check, so keep it
   * a cheap filter without side effects (team, kind, alive); costlier or stateful checks go on the result.
   */
  near(center: Vec2, radius: number, predicate: (unit: Unit) => boolean = () => true) {
    const hits = this.system.search({
      minX: center.x - radius,
      minY: center.y - radius,
      maxX: center.x + radius,
      maxY: center.y + radius,
    })

    const result: Unit[] = []
    for (const body of hits) {
      const unit = body.userData
      if (unit && predicate(unit) && distance(center, unit.position) - unit.radius <= radius) {
        result.push(unit)
      }
    }

    return result
  }

  dispose() {
    for (const off of this.unsubscribe) {
      off()
    }
  }

  private insert(unit: Unit) {
    if (unit.body) {
      return
    }

    unit.body = this.system.createCircle(unit.position, unit.radius * BODY_SCALE, {
      isStatic: !unit.speed,
      userData: unit,
    }) as Circle<Unit>
  }

  private remove(unit: Unit) {
    if (!unit.body) {
      return
    }

    this.system.remove(unit.body)
    delete unit.body
  }
}
