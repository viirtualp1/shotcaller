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

  sync() {
    for (const unit of this.units) {
      unit.body?.setPosition(unit.position.x, unit.position.y, false)
    }

    this.system.update()
  }

  separate() {
    this.system.separate()

    for (const unit of this.units) {
      if (!unit.body || unit.body.isStatic) {
        continue
      }

      unit.position.x = unit.body.x
      unit.position.y = unit.body.y
    }
  }

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
      if (unit && distance(center, unit.position) - unit.radius <= radius && predicate(unit)) {
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
