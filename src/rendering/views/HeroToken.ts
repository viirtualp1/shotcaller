import gsap from 'gsap'
import { Graphics, Text } from 'pixi.js'
import type { ItemId, StarLevel, TeamId } from '@/content/ids'
import { distance, type Vec2 } from '@/core/math/vec2'
import type { Entity } from '@/simulation/ecs/components'
import { FONTS, PALETTE, TEAM_COLORS } from '../theme'
import { drawBar, strokeArc } from './bars'
import { EntityView } from './EntityView'

export const TOKEN_RADIUS = 16
const HIT_SLOP = 4

/** A hero token under the pointer, identified by its roster uid. */
export interface HeroHit {
  readonly uid: string
  readonly team: TeamId
}

export const isOverToken = (center: Vec2, point: Vec2): boolean =>
  distance(center, point) <= TOKEN_RADIUS + HIT_SLOP

export interface HeroTokenOptions {
  readonly color: number
  readonly team: TeamId
  readonly glyph: string
  readonly stars: StarLevel
  readonly items: readonly ItemId[]
}

export interface TokenEffects {
  readonly stunned?: boolean
  readonly rooted?: boolean
  readonly slowed?: boolean
  readonly poisoned?: boolean
  readonly spinning?: boolean
  readonly shielded?: boolean
  readonly selected?: boolean
  readonly hovered?: boolean
}

/** A coach's magnet on the tactics board. */
export class HeroToken extends EntityView {
  private readonly overlay = new Graphics()
  private readonly flashRing = new Graphics()
  private readonly bars = new Graphics()
  private wasDead = false
  private hovered = false

  constructor(private readonly options: HeroTokenOptions) {
    super()
    const r = TOKEN_RADIUS
    const disc = new Graphics()
    disc.circle(1.5, 3, r).fill({ color: 0x000000, alpha: 0.4 })
    disc.circle(0, 0, r).fill(TEAM_COLORS[options.team])
    disc.circle(0, 0, r - 4).fill(options.color)
    disc.circle(-r * 0.3, -r * 0.35, r * 0.35).fill({ color: 0xffffff, alpha: 0.18 })
    for (let i = 0; i < options.stars; i++) {
      const x = (i - (options.stars - 1) / 2) * 8
      disc
        .star(x, r + 5, 5, 3.6, 1.6)
        .fill(PALETTE.gold)
        .stroke({ width: 0.9, color: PALETTE.ink })
    }
    options.items.forEach((_, i) => {
      disc
        .roundRect(r * 0.55 + i * 7, -r - 2, 6, 6, 1.5)
        .fill(PALETTE.gold)
        .stroke({ width: 0.8, color: PALETTE.ink })
    })
    const label = new Text({
      text: options.glyph,
      style: { fontFamily: FONTS.ui, fontSize: 12.5, fontWeight: '700', fill: PALETTE.ink },
      resolution: 4,
    })
    label.anchor.set(0.5)
    this.flashRing.circle(0, 0, r + 1).fill({ color: 0xffffff })
    this.flashRing.alpha = 0
    this.body.addChild(this.overlay, disc, label, this.flashRing, this.bars)
  }

  setBars(health: number | null, mana: number | null): void {
    this.bars.clear()
    const y = -TOKEN_RADIUS - 10
    if (health !== null) {
      drawBar(this.bars, { y, width: 34, height: 4.5, ratio: health, color: TEAM_COLORS[this.options.team] })
    }
    if (mana !== null)
      drawBar(this.bars, { y: y + 5, width: 34, height: 2, ratio: mana, color: PALETTE.mana })
  }

  setEffects(effects: TokenEffects, time: number): void {
    const g = this.overlay.clear()
    const r = TOKEN_RADIUS
    if (effects.selected || effects.hovered) {
      const spin = time * 1.5
      const color = effects.selected ? PALETTE.gold : PALETTE.chalk
      for (let i = 0; i < 8; i++) {
        const a = spin + (i * Math.PI) / 4
        strokeArc(g, r + 6, a, a + 0.45, { width: 2.2, color, alpha: effects.selected ? 1 : 0.6 })
      }
    }
    if (effects.shielded) {
      g.circle(0, 0, r + 5)
        .fill({ color: 0xe4d6ff, alpha: 0.18 })
        .stroke({ width: 1.8, color: 0xe4d6ff })
    }
    if (effects.rooted) g.circle(0, 0, r + 3).stroke({ width: 2, color: PALETTE.heal, alpha: 0.9 })
    if (effects.slowed) g.circle(0, 0, r + 1.5).stroke({ width: 2, color: PALETTE.frost, alpha: 0.9 })
    if (effects.poisoned) {
      for (let i = 0; i < 3; i++) {
        const a = time * 2 + i * 2.1
        g.circle(Math.cos(a) * (r - 2), Math.sin(a) * (r - 2), 2.4).fill({ color: 0x8bdc5a, alpha: 0.9 })
      }
    }
    if (effects.spinning) {
      for (let i = 0; i < 3; i++) {
        const a = time * 14 + (i * Math.PI * 2) / 3
        strokeArc(g, r + 9, a, a + 0.9, { width: 2.6, color: PALETTE.chalk, alpha: 0.85 })
      }
    }
    if (effects.stunned) {
      for (let i = 0; i < 3; i++) {
        const a = time * 5 + (i * Math.PI * 2) / 3
        g.star(Math.cos(a) * 10, -r - 16 + Math.sin(a) * 3, 4, 3, 1.2).fill(PALETTE.gold)
      }
    }
  }

  setHovered(hovered: boolean): void {
    this.hovered = hovered
  }

  flash(): void {
    gsap.killTweensOf(this.flashRing)
    gsap.fromTo(this.flashRing, { alpha: 0.75 }, { alpha: 0, duration: 0.18 })
  }

  sync(entity: Entity, time: number): void {
    const dead = Boolean(entity.dead)
    if (dead !== this.wasDead) {
      this.wasDead = dead
      if (dead) gsap.to(this.body, { alpha: 0, duration: 0.35 })
      else this.appear()
    }
    if (!entity.health) return
    this.setBars(
      entity.health.current / entity.health.max,
      entity.mana ? entity.mana.current / entity.mana.max : null,
    )
    const status = entity.status
    this.setEffects(
      {
        stunned: (status?.stun ?? 0) > 0,
        rooted: (status?.root ?? 0) > 0,
        slowed: (status?.slow ?? 0) > 0,
        poisoned: Boolean(entity.dot),
        spinning: Boolean(entity.spin),
        shielded: Boolean(entity.shield),
        hovered: this.hovered,
      },
      time,
    )
  }

  override destroy(options?: Parameters<EntityView['destroy']>[0]): void {
    gsap.killTweensOf(this.flashRing)
    super.destroy(options)
  }
}
