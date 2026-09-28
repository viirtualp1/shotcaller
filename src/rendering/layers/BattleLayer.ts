import { Container } from 'pixi.js'
import { HEROES } from '@/content/heroes'
import { distance, type Vec2 } from '@/core/math/vec2'
import type { BattleSimulation } from '@/simulation/BattleSimulation'
import { isAlive, type Entity } from '@/simulation/ecs/components'
import type { SimulationEvents } from '@/simulation/events'
import type { Perspective } from '../perspective'
import type { RoleIcons } from '../roleIcons'
import { PALETTE, TEAM_COLORS } from '../theme'
import { CreepView } from '../views/CreepView'
import type { EntityView } from '../views/EntityView'
import { HeroToken, isOverToken } from '../views/HeroToken'
import { ProjectileView, TurretView, ZoneView } from '../views/MiscViews'
import { StructureView, type StructureZone } from '../views/StructureView'

const MELEE_LUNGE = 6
const RANGED_RECOIL = -2

export class BattleLayer extends Container {
  private readonly zones = new Container()
  private readonly structures = new Container()
  private readonly creeps = new Container()
  private readonly heroes = new Container()
  private readonly projectiles = new Container()
  private readonly views = new Map<Entity, EntityView>()
  private subscriptions: (() => void)[] = []
  private hoveredUid: string | null = null
  private simulation: BattleSimulation | null = null

  constructor(
    private readonly icons: RoleIcons,
    private readonly perspective: Perspective,
  ) {
    super()
    this.addChild(this.zones, this.structures, this.creeps, this.heroes, this.projectiles)
  }

  attach(simulation: BattleSimulation) {
    this.detach()
    this.simulation = simulation
    const { world, events } = simulation
    for (const entity of world) {
      this.add(entity, false)
    }

    const onAttack = ({ attacker, target }: SimulationEvents['attacked']) => {
      const view = this.views.get(attacker)
      if (view instanceof StructureView) {
        view.fire()
      } else if (view) {
        view.lunge(target.position, attacker.attack?.ranged ? RANGED_RECOIL : MELEE_LUNGE)
      }
    }

    const onDamage = ({ target }: SimulationEvents['damaged']) => {
      const view = this.views.get(target)
      if (view instanceof HeroToken) {
        view.flash()
      }
    }

    events.on('attacked', onAttack)
    events.on('damaged', onDamage)

    this.subscriptions = [
      world.onEntityAdded.subscribe((entity) => this.add(entity, true)),
      world.onEntityRemoved.subscribe((entity) => this.remove(entity, true)),
      () => events.off('attacked', onAttack),
      () => events.off('damaged', onDamage),
    ]
  }

  detach() {
    for (const off of this.subscriptions) {
      off()
    }

    this.subscriptions = []
    this.simulation = null

    for (const entity of [...this.views.keys()]) {
      this.remove(entity, false)
    }
  }

  update(dt: number, time: number) {
    for (const [entity, view] of this.views) {
      view.follow(entity.position, entity.projectile ? Infinity : dt)

      if (view instanceof HeroToken) {
        view.setHovered(entity.hero?.uid === this.hoveredUid)
      }

      view.sync(entity, time)

      if (view instanceof StructureView) {
        view.setZone(this.zoneOf(entity))
      }
    }
  }

  /** Enemies inside the range win over a throne healing its own heroes. */
  private zoneOf(structure: Entity): StructureZone {
    const range = structure.attack?.range
    if (!this.simulation || !range || !structure.position || !isAlive(structure)) {
      return null
    }

    let healing = false
    for (const unit of this.simulation.queries.units) {
      if (
        unit.kind === 'structure' ||
        !isAlive(unit) ||
        distance(unit.position, structure.position) > range + unit.radius
      ) {
        continue
      }

      if (unit.team !== structure.team) {
        return 'threat'
      }

      healing ||= Boolean(structure.healAura) && unit.kind === 'hero' && unit.health.current < unit.health.max
    }

    return healing ? 'heal' : null
  }

  setHovered(uid: string | null) {
    this.hoveredUid = uid
  }

  heroAt(point: Vec2) {
    for (const [entity, view] of this.views) {
      if (entity.hero && isAlive(entity) && isOverToken(view.position, point)) {
        return {
          uid: entity.hero.uid,
          team: this.perspective.seen(entity.team),
        }
      }
    }

    return null
  }

  heroPosition(uid: string) {
    for (const [entity, view] of this.views) {
      if (entity.hero?.uid === uid && isAlive(entity)) {
        return {
          x: view.x,
          y: view.y,
        }
      }
    }

    return null
  }

  private add(entity: Entity, animate: boolean) {
    if (this.views.has(entity)) {
      return
    }

    const created = this.createView(entity)
    if (!created) {
      return
    }

    const [view, parent] = created
    this.perspective.transpose(view)
    view.follow(entity.position, Infinity)
    view.sync(entity, 0)
    parent.addChild(view)
    this.views.set(entity, view)

    if (animate && !entity.projectile) {
      view.appear()
    }
  }

  private remove(entity: Entity, animate: boolean) {
    const view = this.views.get(entity)
    if (!view) {
      return
    }

    this.views.delete(entity)

    const dispose = () => {
      if (!view.destroyed) {
        view.destroy({ children: true })
      }
    }

    if (animate && !entity.projectile) {
      view.vanish(dispose)
    } else {
      dispose()
    }
  }

  private createView(entity: Entity): [EntityView, Container] | null {
    const team = this.perspective.seen(entity.team)

    if (entity.hero) {
      const token = new HeroToken({
        color: entity.color ?? PALETTE.chalk,
        team,
        icon: this.icons[HEROES[entity.hero.heroId].role],
        stars: entity.hero.stars,
        items: entity.hero.items,
      })

      return [token, this.heroes]
    }

    if (entity.creep && entity.radius) {
      return [new CreepView(team, entity.creep, entity.radius, entity.color), this.creeps]
    }

    if (entity.structure) {
      return [new StructureView(team, entity.structure.type), this.structures]
    }

    if (entity.kind === 'turret') {
      return [new TurretView(entity.color ?? TEAM_COLORS[team], team), this.creeps]
    }

    if (entity.projectile) {
      return [
        new ProjectileView(entity.projectile.visual, entity.color ?? TEAM_COLORS[team]),
        this.projectiles,
      ]
    }

    if (entity.zone) {
      return [new ZoneView(entity.zone.radius, entity.color ?? PALETTE.frost), this.zones]
    }

    return null
  }
}
