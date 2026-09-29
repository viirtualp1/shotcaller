import { Container, Graphics } from 'pixi.js'
import type { LaneStance } from '@/content/ids'
import type { LaneMap, LanePath } from '@/simulation/map/LaneMap'
import { PALETTE } from '../theme'

/** Just past the heroes waiting in front of their own tower, so no token covers the mark. */
const AHEAD_OF_TOWER = 95
const STRETCH = 150
const PEAK_ALPHA = 0.5
const CHEVRONS = 4
/** World units a second. */
const SPEED = 36

const CHEVRON = {
  reach: 10,
  depth: 8,
  width: 4,
}

const BARRIER = {
  reach: 26,
  arm: 9,
  width: 4,
}

/**
 * A lane's order drawn on the lane itself, on the coach's side: chevrons marching at the enemy for Push, a line
 * across the lane for Hold, chevrons closing in from both sides for Together.
 */
export class OrderMark extends Container {
  private readonly marks: Graphics[] = []
  private readonly start: number

  constructor(
    readonly stance: LaneStance,
    private readonly map: LaneMap,
    private readonly path: LanePath,
  ) {
    super()
    this.start = map.frontTowerAlong(path) + AHEAD_OF_TOWER

    if (stance === 'hold') {
      this.marks.push(barrier())
      this.place(this.marks[0]!, this.start)
    } else {
      this.marks.push(...Array.from({ length: CHEVRONS }, chevron))
    }

    this.addChild(...this.marks)
  }

  update(time: number) {
    if (this.stance === 'push') {
      this.march(time)
    } else if (this.stance === 'group') {
      this.gather(time)
    } else {
      this.marks[0]!.alpha = PEAK_ALPHA * (0.65 + 0.35 * Math.sin(time * 2.4))
    }
  }

  /** Chevrons walk the stretch towards the enemy, fading in behind and out ahead. */
  private march(time: number) {
    this.marks.forEach((mark, i) => {
      const t = (time * (SPEED / STRETCH) + i / CHEVRONS) % 1
      this.place(mark, this.start + t * STRETCH)
      mark.alpha = Math.sin(t * Math.PI) * PEAK_ALPHA
    })
  }

  /** Half the chevrons come from behind, half from ahead, and they meet in the middle of the stretch. */
  private gather(time: number) {
    const half = STRETCH / 2
    const middle = this.start + half

    this.marks.forEach((mark, i) => {
      const ahead = i % 2 === 1
      const t = (time * (SPEED / half) + Math.floor(i / 2) / (CHEVRONS / 2)) % 1
      const gap = (1 - t) * half
      this.place(mark, ahead ? middle + gap : middle - gap, ahead)
      mark.alpha = Math.sin(t * Math.PI) * PEAK_ALPHA
    })
  }

  /** Stands a mark on the lane facing along it, or back towards its own base. */
  private place(mark: Graphics, along: number, backwards = false) {
    const at = this.map.pointAt(this.path, along)
    const tangent = this.map.tangentAt(this.path, along)
    mark.position.set(at.x, at.y)
    mark.rotation = Math.atan2(tangent.y, tangent.x) + (backwards ? Math.PI : 0)
  }
}

/** Points along +x, the way the lane runs. */
function chevron() {
  const { reach, depth, width } = CHEVRON

  return new Graphics().moveTo(-depth, -reach).lineTo(0, 0).lineTo(-depth, reach).stroke({
    width,
    color: PALETTE.gold,
    cap: 'round',
    join: 'round',
  })
}

/** Across the lane, its arms turned back towards the coach's base. */
function barrier() {
  const { reach, arm, width } = BARRIER

  return new Graphics().moveTo(-arm, -reach).lineTo(0, -reach).lineTo(0, reach).lineTo(-arm, reach).stroke({
    width,
    color: PALETTE.gold,
    cap: 'round',
    join: 'round',
  })
}
