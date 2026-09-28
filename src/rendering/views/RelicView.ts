import { Container, Graphics } from 'pixi.js'
import { PALETTE } from '../theme'

const ORB_RADIUS = 9
const PULSE_SPEED = 3

/** A heal relic on the bridge: a glowing orb while it can be taken, gone while it comes back. */
export class RelicView extends Container {
  private readonly glow = new Graphics()

  constructor() {
    super()

    this.glow.circle(0, 0, ORB_RADIUS * 2).fill({
      color: PALETTE.heal,
      alpha: 0.18,
    })

    const orb = new Graphics()
      .circle(0, 0, ORB_RADIUS)
      .fill({
        color: PALETTE.heal,
        alpha: 0.9,
      })
      .stroke({
        width: 2,
        color: PALETTE.chalk,
        alpha: 0.8,
      })

    const cross = new Graphics().rect(-1.5, -5, 3, 10).rect(-5, -1.5, 10, 3).fill({ color: PALETTE.ink })

    this.addChild(this.glow, orb, cross)
  }

  show(ready: boolean, time: number) {
    this.visible = ready
    this.glow.scale.set(1 + Math.sin(time * PULSE_SPEED) * 0.15)
  }
}
