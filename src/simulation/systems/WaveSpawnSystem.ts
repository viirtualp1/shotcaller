import { HEROES } from '@/content/heroes'
import { LANE_IDS, opponentOf, TEAM_IDS, type LaneId, type TeamId } from '@/content/ids'
import { ROLES } from '@/content/roles'
import { BATTLE } from '@/content/rules'
import type { CreepVariant } from '@/content/units'
import { isAlive } from '../ecs/components'
import type { SimulationContext, System } from '../SimulationContext'

const FORMATION: readonly (readonly [CreepVariant, number])[] = [
  ['melee', -10],
  ['melee', 0],
  ['melee', 10],
  ['ranged', -22],
]

const SIEGE_OFFSET = -40

export class WaveSpawnSystem implements System {
  private nextWaveAt: number = BATTLE.firstWaveAt
  private wave = 0
  private readonly creepDamageBonus: Record<TeamId, Record<LaneId, number>>

  constructor(private readonly ctx: SimulationContext) {
    const bonusFor = (team: TeamId, lane: LaneId) =>
      ctx.setup.lineups[team][lane].reduce(
        (sum, h) => sum + (ROLES[HEROES[h.heroId].role].laneCreepDamageBonus ?? 0),
        0,
      )

    this.creepDamageBonus = {
      0: {
        top: bonusFor(0, 'top'),
        mid: bonusFor(0, 'mid'),
        bot: bonusFor(0, 'bot'),
      },
      1: {
        top: bonusFor(1, 'top'),
        mid: bonusFor(1, 'mid'),
        bot: bonusFor(1, 'bot'),
      },
    }
  }

  update() {
    if (this.ctx.clock.elapsed < this.nextWaveAt) {
      return
    }

    this.nextWaveAt += BATTLE.waveInterval

    for (const team of TEAM_IDS) {
      for (const lane of LANE_IDS) {
        this.spawnWave(team, lane)
      }
    }

    this.wave++
  }

  private spawnWave(team: TeamId, lane: LaneId) {
    const round = this.ctx.setup.round
    const mega = this.towerDown(opponentOf(team), lane)
    const strength = (1 + BATTLE.creepScalePerRound * (round - 1)) * (mega ? BATTLE.megaCreepMultiplier : 1)
    const path = this.ctx.map.path(team, lane)
    const spawnAlong = path.length * BATTLE.creepSpawnFraction

    const withSiege =
      round >= BATTLE.siegeFromRound && (round >= BATTLE.siegeEveryWaveFromRound || this.wave % 2 === 1)

    const formation = withSiege ? [...FORMATION, ['siege', SIEGE_OFFSET] as const] : FORMATION
    for (const [variant, offset] of formation) {
      this.ctx.factory.creep({
        team,
        lane,
        variant,
        along: spawnAlong + offset,
        strength,
        damageBonus: this.creepDamageBonus[team][lane],
        mega,
      })
    }
  }

  private towerDown(team: TeamId, lane: LaneId) {
    return !this.ctx.queries.structures.entities.some(
      (s) => s.team === team && s.structure.lane === lane && isAlive(s),
    )
  }
}
