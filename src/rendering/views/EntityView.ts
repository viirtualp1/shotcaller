import gsap from 'gsap'
import { Container } from 'pixi.js'
import type { Vec2 } from '@/core/math/vec2'
import type { Entity } from '@/simulation/ecs/components'

/** Farther jumps than this are teleports (blink, hook) and are not smoothed. */
const SNAP_DISTANCE = 60
const FOLLOW_RATE = 18

export abstract class EntityView extends Container {
  /** Animations move this inner container so they never fight the simulated position. */
  protected readonly body = new Container()
  private placed = false

  constructor() {
    super()
    this.addChild(this.body)
  }

  abstract sync(entity: Entity, time: number): void

  follow(target: Vec2, dt: number) {
    const dx = target.x - this.x
    const dy = target.y - this.y
    if (!this.placed || Math.hypot(dx, dy) > SNAP_DISTANCE) {
      this.position.set(target.x, target.y)
      this.placed = true

      return
    }

    const k = Math.min(1, dt * FOLLOW_RATE)
    this.position.set(this.x + dx * k, this.y + dy * k)
  }

  appear() {
    this.body.scale.set(0.4)
    this.body.alpha = 0

    gsap.to(this.body, {
      alpha: 1,
      duration: 0.25,
    })

    gsap.to(this.body.scale, {
      x: 1,
      y: 1,
      duration: 0.35,
      ease: 'back.out(2.2)',
    })
  }

  vanish(onComplete: () => void) {
    gsap.killTweensOf(this.body)

    gsap.to(this.body, {
      alpha: 0,
      duration: 0.3,
      ease: 'power1.in',
    })

    gsap.to(this.body.scale, {
      x: 0.5,
      y: 0.5,
      duration: 0.3,
      ease: 'power1.in',
      onComplete,
    })
  }

  lunge(toward: Vec2, distance = 6) {
    const dx = toward.x - this.x
    const dy = toward.y - this.y
    const length = Math.hypot(dx, dy) || 1
    gsap.killTweensOf(this.body.position)

    gsap.fromTo(
      this.body.position,
      {
        x: 0,
        y: 0,
      },
      {
        x: (dx / length) * distance,
        y: (dy / length) * distance,
        duration: 0.07,
        yoyo: true,
        repeat: 1,
      },
    )
  }

  pop(scale = 1.25) {
    gsap.killTweensOf(this.body.scale)

    gsap.fromTo(
      this.body.scale,
      {
        x: scale,
        y: scale,
      },
      {
        x: 1,
        y: 1,
        duration: 0.25,
        ease: 'power2.out',
      },
    )
  }

  override destroy(options?: Parameters<Container['destroy']>[0]) {
    gsap.killTweensOf(this.body)
    gsap.killTweensOf(this.body.scale)
    gsap.killTweensOf(this.body.position)
    super.destroy(options)
  }
}
