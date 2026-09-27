import gsap from 'gsap'
import { Graphics } from 'pixi.js'
import type { TeamId } from '@/content/ids'
import { STRUCTURES, type StructureType } from '@/content/units'
import type { Entity } from '@/simulation/ecs/components'
import { PALETTE, TEAM_COLORS } from '../theme'
import { drawBar, strokeArc } from './bars'
import { EntityView } from './EntityView'

const RANGE_DASHES = 36

export class StructureView extends EntityView {
  private readonly range = new Graphics()
  private readonly shape = new Graphics()
  private readonly muzzle = new Graphics()
  private readonly bar = new Graphics()
  private rubble: boolean | null = null
  private lastHealth = Infinity
  private aggro: boolean | null = null

  constructor(
    private readonly team: TeamId,
    private readonly type: StructureType,
  ) {
    super()
    const { radius } = STRUCTURES[type]
    this.muzzle.circle(0, 0, radius * 0.7).fill({ color: 0xffffff })
    this.muzzle.alpha = 0
    this.addChildAt(this.range, 0)
    this.body.addChild(this.shape, this.muzzle, this.bar)
  }

  show(health: number, maxHealth: number, showRange: boolean) {
    const destroyed = health <= 0
    if (destroyed !== this.rubble) {
      this.drawShape(destroyed)
    }

    if (health < this.lastHealth - 1 && this.lastHealth !== Infinity) {
      this.shake()
    }

    this.lastHealth = health
    this.bar.clear()

    if (!destroyed) {
      const width = this.type === 'throne' ? 52 : 36
      const y = -STRUCTURES[this.type].radius - 11
      drawBar(this.bar, {
        y,
        width,
        height: 4.5,
        ratio: health / maxHealth,
        color: TEAM_COLORS[this.team],
      })
    }

    if (!showRange || destroyed) {
      this.range.clear()
    }
  }

  /** Lights up the attack radius while the structure is shooting at something. */
  setAggro(active: boolean) {
    if (active === this.aggro || this.rubble) {
      return
    }

    this.aggro = active
    const { range } = STRUCTURES[this.type]
    const color = TEAM_COLORS[this.team]
    const g = this.range.clear()
    if (!active) {
      g.circle(0, 0, range).stroke({
        width: 1,
        color,
        alpha: 0.16,
      })

      return
    }

    g.circle(0, 0, range).fill({
      color,
      alpha: 0.06,
    })

    for (let i = 0; i < RANGE_DASHES; i++) {
      const a = (i / RANGE_DASHES) * Math.PI * 2
      strokeArc(g, range, a, a + (Math.PI / RANGE_DASHES) * 1.1, {
        width: 2,
        color,
        alpha: 0.7,
      })
    }
  }

  fire() {
    gsap.killTweensOf(this.muzzle)

    gsap.fromTo(
      this.muzzle,
      { alpha: 0.9 },
      {
        alpha: 0,
        duration: 0.25,
        ease: 'power2.out',
      },
    )

    this.pop(1.12)
  }

  sync(entity: Entity) {
    if (entity.health) {
      this.show(entity.dead ? 0 : entity.health.current, entity.health.max, true)
    }

    this.setAggro(Boolean(entity.targeting?.target) && !entity.dead)
  }

  private shake() {
    if (gsap.isTweening(this.shape)) {
      return
    }

    gsap.fromTo(
      this.shape,
      { x: -1.5 },
      {
        x: 0,
        duration: 0.12,
        ease: 'elastic.out(3, 0.3)',
      },
    )
  }

  private drawShape(destroyed: boolean) {
    const wasStanding = this.rubble === false
    this.rubble = destroyed
    const g = this.shape.clear()
    const color = TEAM_COLORS[this.team]
    const { radius } = STRUCTURES[this.type]
    if (destroyed) {
      this.range.clear()
      const r = radius * 0.8
      g.moveTo(-r, -r).lineTo(r, r).moveTo(r, -r).lineTo(-r, r).stroke({
        width: 2.5,
        color: PALETTE.chalkDim,
        alpha: 0.7,
      })

      if (wasStanding) {
        this.pop(1.8)
      }

      return
    }

    if (this.type === 'tower') {
      g.poly([0, -radius, radius, 0, 0, radius, -radius, 0]).fill(PALETTE.ink).stroke({
        width: 2.5,
        color,
      })

      g.poly([0, -radius * 0.45, radius * 0.45, 0, 0, radius * 0.45, -radius * 0.45, 0]).fill({
        color,
        alpha: 0.7,
      })

      return
    }

    const hex = Array.from({ length: 6 }, (_, i) => {
      const a = Math.PI / 6 + (i * Math.PI) / 3
      return [Math.cos(a) * radius, Math.sin(a) * radius]
    }).flat()

    g.poly(hex).fill(PALETTE.ink).stroke({
      width: 3,
      color,
    })

    g.circle(0, 0, radius * 0.45).fill({
      color,
      alpha: 0.75,
    })
  }

  override destroy(options?: Parameters<EntityView['destroy']>[0]) {
    gsap.killTweensOf(this.shape)
    gsap.killTweensOf(this.muzzle)
    super.destroy(options)
  }
}
