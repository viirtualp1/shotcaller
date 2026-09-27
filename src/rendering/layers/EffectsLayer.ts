import gsap from 'gsap'
import { Container, Graphics, Text, type ContainerChild } from 'pixi.js'
import { ABILITY_NAMES } from '@/content/abilities'
import { ITEMS } from '@/content/items'
import type { Vec2 } from '@/core/math/vec2'
import type { SimulationEmitter, SimulationEvents } from '@/simulation/events'
import { FONTS, PALETTE, TEAM_COLORS } from '../theme'
import { TOKEN_RADIUS } from '../views/HeroToken'

const MIN_HEAL_TO_SHOW = 25
const MIN_HERO_DAMAGE_TO_SHOW = 40
/** Skipping a battle replays hundreds of events in one frame; only a handful are worth drawing. */
const EFFECTS_PER_FRAME = 24
const BIG_BURST = 120

type Handler<K extends keyof SimulationEvents> = (payload: SimulationEvents[K]) => void

export class EffectsLayer extends Container {
  private detachers: (() => void)[] = []
  private budget = EFFECTS_PER_FRAME

  constructor(private readonly shake: (strength: number) => void) {
    super()
  }

  nextFrame() {
    this.budget = EFFECTS_PER_FRAME
  }

  attach(events: SimulationEmitter) {
    this.detach()

    this.listen(events, 'abilityCast', ({ caster, ability }) =>
      this.floatText(ABILITY_NAMES[ability], caster.position, PALETTE.chalk, 18, FONTS.hand, -28),
    )

    this.listen(events, 'heroKilled', ({ victim, killer }) => {
      this.floatText('✕', victim.position, TEAM_COLORS[killer.team], 26, FONTS.ui)
      this.ring(victim.position, 34, TEAM_COLORS[killer.team], 0.5)
    })

    this.listen(events, 'damaged', ({ target, amount, type }) => {
      if (target.kind !== 'hero' || amount < MIN_HERO_DAMAGE_TO_SHOW) {
        return
      }

      const color = type === 'magical' ? 0xc6b3ff : PALETTE.chalk
      this.floatText(String(Math.round(amount)), jitter(target.position), color, 13, FONTS.ui, -4)
    })

    this.listen(events, 'healed', ({ target, amount }) => {
      if (amount >= MIN_HEAL_TO_SHOW) {
        this.floatText(`+${Math.round(amount)}`, jitter(target.position), PALETTE.heal, 13, FONTS.ui, -4)
      }
    })

    this.listen(events, 'shielded', ({ target }) => this.ring(target.position, 26, 0xe4d6ff, 0.4))

    this.listen(events, 'revived', ({ hero, byItem }) => {
      if (!byItem) {
        return
      }

      this.ring(hero.position, 44, PALETTE.gold, 0.8)
      this.floatText(ITEMS.aegis.name, hero.position, PALETTE.gold, 18, FONTS.hand, -28)
    })

    this.listen(events, 'dash', ({ from, to, color }) => this.streak(from, to, color, false))
    this.listen(events, 'hook', ({ from, to, color }) => this.streak(from, to, color, true))
    this.listen(events, 'chain', ({ points, color }) => this.lightning(points, color))

    this.listen(events, 'burst', ({ at, radius, color }) => {
      this.ring(at, radius, color)

      if (radius >= BIG_BURST) {
        this.shake(4)
      }
    })

    this.listen(events, 'attacked', ({ attacker, target }) => {
      if (attacker.kind === 'structure') {
        this.tracer(attacker.position, target.position, TEAM_COLORS[attacker.team])
      } else if (attacker.kind === 'hero' && !attacker.attack?.ranged) {
        this.slash(target.position, TEAM_COLORS[attacker.team])
      }
    })

    this.listen(events, 'structureDestroyed', ({ structure }) => {
      this.debris(structure.position, TEAM_COLORS[structure.team])
      this.ring(structure.position, 70, PALETTE.chalk, 0.9)
      this.shake(structure.structure?.type === 'throne' ? 14 : 8)
    })
  }

  detach() {
    for (const off of this.detachers) {
      off()
    }

    this.detachers = []

    for (const child of [...this.children]) {
      this.dispose(child)
    }
  }

  private listen<K extends keyof SimulationEvents>(events: SimulationEmitter, type: K, handler: Handler<K>) {
    const budgeted: Handler<K> = (payload) => {
      if (this.budget <= 0) {
        return
      }

      this.budget--
      handler(payload)
    }

    events.on(type, budgeted)
    this.detachers.push(() => events.off(type, budgeted))
  }

  private dispose(child: ContainerChild) {
    gsap.killTweensOf(child)
    gsap.killTweensOf(child.scale)

    if (!child.destroyed) {
      child.destroy({ children: true })
    }
  }

  private floatText(text: string, at: Vec2, color: number, size: number, fontFamily: string, offset = -12) {
    const label = new Text({
      text,
      style: {
        fontFamily,
        fontSize: size,
        fontWeight: '700',
        fill: color,
        stroke: {
          color: PALETTE.ink,
          width: 3,
        },
      },
      resolution: 3,
    })

    label.anchor.set(0.5)
    label.position.set(at.x, at.y - TOKEN_RADIUS + offset)
    label.scale.set(0.6)
    this.addChild(label)

    gsap.to(label.scale, {
      x: 1,
      y: 1,
      duration: 0.2,
      ease: 'back.out(3)',
    })

    gsap.to(label, {
      y: label.y - 24,
      alpha: 0,
      duration: 1.1,
      delay: 0.25,
      ease: 'power1.in',
      onComplete: () => this.dispose(label),
    })
  }

  private streak(from: Vec2, to: Vec2, color: number, dotted: boolean) {
    const g = new Graphics()
    if (dotted) {
      const steps = Math.max(2, Math.floor(Math.hypot(to.x - from.x, to.y - from.y) / 12))
      for (let i = 0; i <= steps; i++) {
        g.circle(from.x + ((to.x - from.x) * i) / steps, from.y + ((to.y - from.y) * i) / steps, 2.2).fill(
          color,
        )
      }
    } else {
      g.moveTo(from.x, from.y).lineTo(to.x, to.y).stroke({
        width: 4,
        color,
        alpha: 0.8,
        cap: 'round',
      })
    }

    this.addChild(g)

    gsap.to(g, {
      alpha: 0,
      duration: 0.45,
      onComplete: () => this.dispose(g),
    })
  }

  private tracer(from: Vec2, to: Vec2, color: number) {
    const g = new Graphics()
    g.moveTo(from.x, from.y).lineTo(to.x, to.y).stroke({
      width: 3,
      color,
      alpha: 0.55,
      cap: 'round',
    })

    g.moveTo(from.x, from.y).lineTo(to.x, to.y).stroke({
      width: 1.2,
      color: 0xffffff,
      alpha: 0.8,
      cap: 'round',
    })

    this.addChild(g)

    gsap.to(g, {
      alpha: 0,
      duration: 0.22,
      ease: 'power2.in',
      onComplete: () => this.dispose(g),
    })
  }

  private lightning(points: readonly Vec2[], color: number) {
    const g = new Graphics()
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1]!
      const b = points[i]!
      g.moveTo(a.x, a.y)

      for (let s = 1; s < 5; s++) {
        const t = s / 5
        g.lineTo(
          a.x + (b.x - a.x) * t + (Math.random() - 0.5) * 12,
          a.y + (b.y - a.y) * t + (Math.random() - 0.5) * 12,
        )
      }

      g.lineTo(b.x, b.y)
    }

    g.stroke({
      width: 2.4,
      color,
      alpha: 0.95,
      join: 'round',
    })

    this.addChild(g)

    gsap.to(g, {
      alpha: 0,
      duration: 0.35,
      ease: 'power2.in',
      onComplete: () => this.dispose(g),
    })
  }

  private ring(at: Vec2, radius: number, color: number, duration = 0.55) {
    const g = new Graphics()
    g.circle(0, 0, radius)
      .fill({
        color,
        alpha: 0.18,
      })
      .stroke({
        width: 2.5,
        color,
        alpha: 0.9,
      })

    g.position.set(at.x, at.y)
    g.scale.set(0.3)
    this.addChild(g)

    gsap.to(g.scale, {
      x: 1,
      y: 1,
      duration,
      ease: 'power2.out',
    })

    gsap.to(g, {
      alpha: 0,
      duration,
      ease: 'power1.in',
      onComplete: () => this.dispose(g),
    })
  }

  private debris(at: Vec2, color: number) {
    for (let i = 0; i < 10; i++) {
      const g = new Graphics().rect(-2, -2, 4, 4).fill(i % 2 ? color : PALETTE.chalk)
      g.position.set(at.x, at.y)
      g.rotation = Math.random() * Math.PI
      this.addChild(g)
      const angle = Math.random() * Math.PI * 2
      const distance = 20 + Math.random() * 30
      gsap.to(g, {
        x: at.x + Math.cos(angle) * distance,
        y: at.y + Math.sin(angle) * distance,
        rotation: g.rotation + 4,
        alpha: 0,
        duration: 0.8,
        ease: 'power2.out',
        onComplete: () => this.dispose(g),
      })
    }
  }

  private slash(at: Vec2, color: number) {
    const g = new Graphics()
    g.moveTo(-7, -7).lineTo(7, 7).stroke({
      width: 2,
      color,
      alpha: 0.9,
    })

    g.position.set(at.x, at.y)
    g.rotation = Math.random() * Math.PI
    this.addChild(g)

    gsap.to(g, {
      alpha: 0,
      duration: 0.2,
      onComplete: () => this.dispose(g),
    })
  }
}

const jitter = (p: Vec2) => ({
  x: p.x + (Math.random() - 0.5) * 14,
  y: p.y,
})
