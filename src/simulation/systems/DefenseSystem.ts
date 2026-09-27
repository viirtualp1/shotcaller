import { TEAM_IDS, type TeamId } from '@/content/ids'
import { BATTLE } from '@/content/rules'
import { distance } from '@/core/math/vec2'
import { isAlive, type Unit } from '../ecs/components'
import { creditedHero } from '../services/CombatService'
import type { SimulationContext, System } from '../SimulationContext'

const isHeroInvader = (unit: Unit) => unit.kind === 'hero'

/**
 * The throne is the game: once enemy heroes hit it, every hero of that team drops its lane,
 * runs home and fights whoever stands at the base until it is clear again. Creeps alone are left to the throne.
 */
export class DefenseSystem implements System {
  private readonly alarm: [number, number] = [0, 0]

  constructor(private readonly ctx: SimulationContext) {
    ctx.events.on('damaged', ({ target, source }) => {
      if (target.structure?.type === 'throne' && creditedHero(source)) {
        this.alarm[target.team] = BATTLE.defense.alarmSeconds
      }
    })
  }

  update(dt: number) {
    for (const team of TEAM_IDS) {
      this.alarm[team] = Math.max(0, this.alarm[team] - dt)
      const throne = this.throneOf(team)
      const invaders = throne ? this.invaders(throne) : []
      const underAttack = throne !== undefined && (this.alarm[team] > 0 || invaders.some(isHeroInvader))

      for (const hero of this.ctx.queries.heroes) {
        if (hero.team !== team) {
          continue
        }

        if (underAttack && throne) {
          this.recall(hero, throne, invaders)
        } else if (hero.defend) {
          this.release(hero)
        }
      }
    }
  }

  /** Enemies close enough to the throne to be worth running home for. */
  private invaders(throne: Unit) {
    const radius = (throne.attack?.range ?? 0) + BATTLE.defense.radiusBonus

    return this.ctx.index.near(
      throne.position,
      radius,
      (u) => u.team !== throne.team && isAlive(u) && u.kind !== 'structure',
    )
  }

  private throneOf(team: TeamId) {
    return this.ctx.queries.structures.entities.find(
      (s) => s.team === team && s.structure.type === 'throne' && isAlive(s),
    ) as Unit | undefined
  }

  private recall(hero: Unit, throne: Unit, invaders: readonly Unit[]) {
    if (hero.roamer) {
      hero.roamer.quarry = null
    }

    let nearest: Unit | null = null
    for (const invader of invaders) {
      if (!nearest || distance(hero.position, invader.position) < distance(hero.position, nearest.position)) {
        nearest = invader
      }
    }

    if (hero.targeting) {
      hero.targeting.target = nearest
      hero.targeting.chasing = nearest !== null
    }

    if (hero.defend) {
      hero.defend.point = throne.position
    } else {
      this.ctx.world.addComponent(hero, 'defend', { point: throne.position })
    }
  }

  private release(hero: Unit) {
    this.ctx.world.removeComponent(hero, 'defend')

    if (hero.targeting) {
      hero.targeting.target = null
      hero.targeting.chasing = true
    }
  }
}
