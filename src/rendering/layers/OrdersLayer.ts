import gsap from 'gsap'
import { Container } from 'pixi.js'
import type { LaneId } from '@/content/ids'
import type { LaneStances } from '@/domain/battle/contracts'
import type { LaneMap } from '@/simulation/map/LaneMap'
import type { Perspective } from '../perspective'
import { OrderMark } from '../views/OrderMark'

const FADE = 0.25

/** The viewer's lane orders, drawn on their side of each lane in planning and in battle alike. */
export class OrdersLayer extends Container {
  private readonly marks = new Map<LaneId, OrderMark>()

  constructor(
    private readonly map: LaneMap,
    private readonly perspective: Perspective,
  ) {
    super()
  }

  show(stances: LaneStances) {
    for (const lane of this.map.lanes) {
      const stance = stances[lane]
      const shown = this.marks.get(lane)
      if (shown?.stance === stance) {
        continue
      }

      if (shown) {
        this.marks.delete(lane)
        this.fadeOut(shown)
      }

      if (stance) {
        const mark = new OrderMark(stance, this.map, this.map.path(this.perspective.inBattle(0), lane))
        this.marks.set(lane, mark)
        this.addChild(mark)

        gsap.from(mark, {
          alpha: 0,
          duration: FADE,
        })
      }
    }
  }

  update(time: number) {
    for (const mark of this.marks.values()) {
      mark.update(time)
    }
  }

  override destroy(options?: Parameters<Container['destroy']>[0]) {
    gsap.killTweensOf(this.children)
    super.destroy(options)
  }

  private fadeOut(mark: OrderMark) {
    gsap.to(mark, {
      alpha: 0,
      duration: FADE,
      onComplete: () => {
        if (!mark.destroyed) {
          mark.destroy({ children: true })
        }
      },
    })
  }
}
