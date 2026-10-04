import { Graphics, Text } from 'pixi.js'
import type { LaneStance, TeamId } from '@/content/ids'
import type { Entity, ProjectileVisual } from '@/simulation/ecs/components'
import { FONTS, PALETTE, TEAM_COLORS } from '../theme'
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

const WOOD_DARK = 0x4e3825

const STANCE_MARK: Readonly<Record<LaneStance | 'none', string>> = {
  push: '»',
  hold: '■',
  group: '◆',
  none: '•',
}

/** A Battle Standard: a pole with a pennant in the Herald's colour, its reach drawn faintly around it. */
export class BannerView extends EntityView {
  private readonly bar = new Graphics()
  private readonly reach = new Graphics()

  constructor(
    color: number,
    private readonly team: TeamId,
    radius: number,
    stance: LaneStance | null,
  ) {
    super()

    this.reach.circle(0, 0, radius).fill({
      color,
      alpha: 0.07,
    })

    this.reach.circle(0, 0, radius).stroke({
      width: 1.5,
      color,
      alpha: 0.35,
    })

    const shape = new Graphics()
    shape.rect(-1.25, -16, 2.5, 20).fill(WOOD_DARK)

    shape.poly([1.25, -16, 14, -12, 1.25, -7]).fill(color).stroke({
      width: 1,
      color: TEAM_COLORS[team],
    })

    shape.circle(0, 4, 3).fill(TEAM_COLORS[team])

    const mark = new Text({
      text: STANCE_MARK[stance ?? 'none'],
      style: {
        fontFamily: FONTS.ui,
        fontSize: 7,
        fill: PALETTE.ink,
      },
    })

    mark.anchor.set(0.5)
    mark.position.set(6, -11.5)
    this.addChildAt(this.reach, 0)
    this.body.addChild(shape, mark, this.bar)
  }

  sync(entity: Entity, time: number) {
    this.reach.alpha = 0.75 + Math.sin(time * 3) * 0.25
    this.bar.clear()

    if (entity.health) {
      drawBar(this.bar, {
        y: -21,
        width: 18,
        height: 2.5,
        ratio: entity.health.current / entity.health.max,
        color: TEAM_COLORS[this.team],
      })
    }
  }
}

const WOOD = 0x82613f

/** A training dummy: a straw head on a post with a crossbar, and its health over it. */
export class DummyView extends EntityView {
  private readonly bar = new Graphics()

  constructor(private readonly team: TeamId) {
    super()
    const shape = new Graphics()
    shape.rect(-1.75, -4, 3.5, 16).fill(WOOD_DARK)

    shape.roundRect(-10, -2, 20, 3.5, 1.5).fill(WOOD).stroke({
      width: 1,
      color: WOOD_DARK,
    })

    shape.circle(0, -8, 5.5).fill(0xd8c27a).stroke({
      width: 1.5,
      color: TEAM_COLORS[team],
    })

    shape.circle(0, -8, 1.8).fill(TEAM_COLORS[team])
    this.body.addChild(shape, this.bar)
  }

  sync(entity: Entity) {
    this.bar.clear()

    if (entity.health) {
      drawBar(this.bar, {
        y: -19,
        width: 22,
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
