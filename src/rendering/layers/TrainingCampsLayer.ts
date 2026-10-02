import { Container, Graphics, Text } from 'pixi.js'
import { SANDBOX, TRAINING_CAMPS, sandboxGoal, type SandboxSettings } from '@/content/sandbox'
import type { LaneMap } from '@/simulation/map/LaneMap'
import type { BoardLabels } from '../labels'
import { FONTS, PALETTE } from '../theme'
import { DummyView } from '../views/MiscViews'

/** Lane-labeled clearings keep practice targets visibly separate from the creep paths. */
export class TrainingCampsLayer extends Container {
  constructor(
    private readonly map: LaneMap,
    private readonly labels: BoardLabels,
  ) {
    super()
  }

  show(settings: SandboxSettings | null, planning: boolean) {
    for (const child of this.removeChildren()) {
      child.destroy({ children: true })
    }

    if (!settings?.dummies) {
      return
    }

    for (const lane of this.map.lanes) {
      const [x, y] = TRAINING_CAMPS[this.map.mode][lane]!
      const color = sandboxGoal(settings, lane) === 'dummies' ? PALETTE.gold : PALETTE.chalkDim
      const clearing = new Graphics()
      if (this.map.definition.deck) {
        const { point } = this.map.project(this.map.path(0, lane), {
          x,
          y,
        })

        clearing.moveTo(point.x, point.y).lineTo(x, y).stroke({
          width: 42,
          color: PALETTE.bridge,
        })
      }

      clearing.circle(x, y, SANDBOX.campRadius).fill({
        color: PALETTE.ink,
        alpha: 0.94,
      })

      clearing.circle(x, y, SANDBOX.campRadius).stroke({
        width: 2,
        color,
        alpha: 0.65,
      })

      clearing.circle(x, y, SANDBOX.campRadius - 7).stroke({
        width: 1,
        color,
        alpha: 0.15,
      })

      const label = new Text({
        text: this.labels.laneName(lane),
        style: {
          fontFamily: FONTS.hand,
          fontSize: 24,
          fontWeight: '700',
          fill: color,
        },
      })

      label.anchor.set(0.5)
      label.position.set(x, y + 47)
      this.addChild(clearing, label)

      if (planning) {
        const dummy = new DummyView(1)
        dummy.position.set(x, y)
        this.addChild(dummy)
      }
    }
  }
}
