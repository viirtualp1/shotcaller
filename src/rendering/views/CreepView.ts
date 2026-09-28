import { Graphics } from 'pixi.js'
import type { TeamId } from '@/content/ids'
import type { CreepData, Entity } from '@/simulation/ecs/components'
import { PALETTE, TEAM_COLORS } from '../theme'
import { drawBar } from './bars'
import { EntityView } from './EntityView'

export class CreepView extends EntityView {
  private readonly bar = new Graphics()

  constructor(
    private readonly team: TeamId,
    creep: CreepData,
    private readonly radius: number,
    ownerColor?: number,
  ) {
    super()
    const color = TEAM_COLORS[team]
    const shape = new Graphics()
    const r = radius * 1.15
    if (creep.summoned) {
      shape.circle(0, 0, r).fill({
        color: ownerColor ?? color,
        alpha: 0.85,
      })

      shape.circle(-r * 0.35, -r * 0.1, r * 0.22).fill(PALETTE.ink)
      shape.circle(r * 0.35, -r * 0.1, r * 0.22).fill(PALETTE.ink)

      shape.circle(0, 0, r).stroke({
        width: 1.4,
        color,
      })
    } else {
      switch (creep.variant) {
        case 'melee':
          shape.circle(0, 0, r)
          break
        case 'ranged':
          shape.poly([0, -r - 1, r + 1, 0, 0, r + 1, -r - 1, 0])
          break
        case 'siege':
          shape.roundRect(-r, -r * 0.8, r * 2, r * 1.6, 2)
          break
      }

      shape
        .fill({
          color,
          alpha: 0.9,
        })
        .stroke({
          width: 1,
          color: PALETTE.ink,
          alpha: 0.8,
        })
    }

    if (creep.mega) {
      shape.circle(0, 0, r + 2.5).stroke({
        width: 1.3,
        color: PALETTE.gold,
        alpha: 0.9,
      })
    }

    this.body.addChild(shape, this.bar)
  }

  sync(entity: Entity) {
    const health = entity.health
    this.bar.clear()

    if (health && health.current < health.max) {
      drawBar(this.bar, {
        y: -this.radius - 6,
        width: 15,
        height: 2.2,
        ratio: health.current / health.max,
        color: TEAM_COLORS[this.team],
      })
    }
  }
}
