import { Graphics } from 'pixi.js'
import type { TeamId } from '@/content/ids'
import type { Entity, ProjectileVisual } from '@/simulation/ecs/components'
import { PALETTE, TEAM_COLORS } from '../theme'
import { drawBar, strokeArc } from './bars'
import { EntityView } from './EntityView'

export class TurretView extends EntityView {
  private readonly bar = new Graphics()

  constructor(
    color: number,
    private readonly team: TeamId,
  ) {
    super()
    const shape = new Graphics()
    shape.rect(-8, -8, 16, 16).fill(PALETTE.ink).stroke({
      width: 2,
      color,
    })

    shape.circle(0, 0, 3.5).fill(color)
    this.body.addChild(shape, this.bar)
  }

  sync(entity: Entity) {
    this.bar.clear()

    if (entity.health) {
      drawBar(this.bar, {
        y: -14,
        width: 18,
        height: 2.5,
        ratio: entity.health.current / entity.health.max,
        color: TEAM_COLORS[this.team],
      })
    }
  }
}

const PROJECTILE_SIZE: Readonly<Record<ProjectileVisual, number>> = {
  bolt: 2.4,
  arrow: 3,
  shell: 6,
  fireball: 7,
  dagger: 3.2,
  bullet: 2.6,
}

const TRAIL_LENGTH = 5

export class ProjectileView extends EntityView {
  private readonly trail = new Graphics()
  private readonly history: { x: number; y: number }[] = []

  constructor(
    private readonly visual: ProjectileVisual,
    private readonly color: number,
  ) {
    super()
    const head = new Graphics()
    const size = PROJECTILE_SIZE[visual]
    if (visual === 'fireball' || visual === 'shell') {
      head.circle(0, 0, size * 1.9).fill({
        color,
        alpha: 0.28,
      })
    }

    head.circle(0, 0, size).fill(color)
    this.addChildAt(this.trail, 0)
    this.body.addChild(head)
  }

  sync(entity: Entity) {
    this.history.unshift({
      x: entity.position.x,
      y: entity.position.y,
    })

    this.history.length = Math.min(this.history.length, TRAIL_LENGTH)
    const g = this.trail.clear()
    const size = PROJECTILE_SIZE[this.visual]
    this.history.forEach((p, i) => {
      if (i === 0) {
        return
      }

      g.circle(p.x - this.x, p.y - this.y, size * (1 - i / TRAIL_LENGTH)).fill({
        color: this.color,
        alpha: 0.35 * (1 - i / TRAIL_LENGTH),
      })
    })
  }
}

export class ZoneView extends EntityView {
  private readonly ring = new Graphics()

  constructor(
    private readonly radius: number,
    private readonly color: number,
  ) {
    super()

    const fill = new Graphics().circle(0, 0, radius).fill({
      color,
      alpha: 0.12,
    })

    this.body.addChild(fill, this.ring)
  }

  sync(_entity: Entity, time: number) {
    const g = this.ring.clear()
    for (let i = 0; i < 12; i++) {
      const a = time * 1.2 + (i * Math.PI) / 6
      strokeArc(g, this.radius, a, a + 0.3, {
        width: 2,
        color: this.color,
        alpha: 0.7,
      })
    }
  }
}
