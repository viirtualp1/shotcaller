import mitt from 'mitt'
import { describe, expect, it } from 'vitest'
import { ABILITY_PARAMS } from '@/content/abilities'
import { HEROES } from '@/content/heroes'
import { HERO_IDS, type LaneStance } from '@/content/ids'
import { HeroPool } from '@/domain/economy/HeroPool'
import { laneRoles, resolveLane } from '@/domain/synergy/resolveLane'
import { ABILITIES } from '@/simulation/abilities/registry'
import { BattleStatsRecorder } from '@/simulation/BattleStatsRecorder'
import type { HeroUnit, Unit } from '@/simulation/ecs/components'
import type { SimulationEvents } from '@/simulation/events'
import { AbilitySystem } from '@/simulation/systems/AbilitySystem'
import { BannerSystem } from '@/simulation/systems/BannerSystem'
import { ChannelSystem } from '@/simulation/systems/ChannelSystem'
import { arena } from '../helpers/battle'

const STEP = 1 / 30
const standard = ABILITY_PARAMS.standard
const mend = ABILITY_PARAMS.mend

/** An enemy creep standing at a given point, for abilities that need someone to cast at. */
function enemyCreepAt(ctx: ReturnType<typeof arena>['ctx'], x: number, y: number) {
  const creep = ctx.factory.creep({
    team: 1,
    lane: 'mid',
    variant: 'melee',
    along: 0,
    strength: 1,
    damageBonus: 0,
    mega: false,
  })

  Object.assign(creep.position, {
    x,
    y,
  })

  return creep
}

function alliedCreepAt(ctx: ReturnType<typeof arena>['ctx'], x: number, y: number) {
  const creep = ctx.factory.creep({
    team: 0,
    lane: 'mid',
    variant: 'melee',
    along: 0,
    strength: 1,
    damageBonus: 0,
    mega: false,
  })

  Object.assign(creep.position, {
    x,
    y,
  })

  return creep
}

function heraldWithBanner(stance?: LaneStance) {
  const battle = arena({
    ours: {
      mid: [
        {
          uid: 'herald',
          heroId: 'herald',
        },
      ],
    },
    stances: stance ? { mid: stance } : {},
  })

  const herald = battle.hero('herald')
  const tower = battle.structure(0, 'mid')
  Object.assign(herald.position, {
    x: tower.position.x + 40,
    y: tower.position.y,
  })

  const enemy = enemyCreepAt(battle.ctx, herald.position.x + 60, herald.position.y)
  const ally = alliedCreepAt(battle.ctx, herald.position.x + 10, herald.position.y + 10)
  battle.ctx.index.sync()

  expect(ABILITIES.standard.cast(herald, battle.ctx)).toBe(true)
  battle.ctx.index.sync()
  const banners = new BannerSystem(battle.ctx)
  banners.update()

  return {
    ...battle,
    banners,
    herald,
    tower,
    enemy,
    ally,
  }
}

describe('Herald', () => {
  it('pushes creeps forward under Push', () => {
    const { ally, herald, tower } = heraldWithBanner('push')

    expect(ally.rally?.attackSpeed).toBe(standard.pushAttackSpeed)
    expect(ally.rally?.structureDamage).toBe(standard.pushStructureDamage)
    expect(herald.rally).toBeUndefined()
    expect(tower.rally).toBeUndefined()
  })

  it('protects buildings under Defence', () => {
    const { ally, tower } = heraldWithBanner('hold')

    expect(tower.rally?.damageTaken).toBe(standard.holdProtection)
    expect(ally.rally).toBeUndefined()
  })

  it('stuns where the banner lands and lifts hero damage under Together', () => {
    const { enemy, herald } = heraldWithBanner('group')

    expect(enemy.status.stun).toBeCloseTo(standard.stun)
    expect(herald.rally?.damage).toBe(standard.groupDamage)
  })

  it('guards heroes when the lane has no order', () => {
    const { enemy, herald } = heraldWithBanner()

    expect(herald.rally?.damageTaken).toBe(standard.guard)
    expect(enemy.status.stun).toBe(0)
  })

  it('stops helping once the banner is cut down', () => {
    const { banners, ctx, herald, simulation } = heraldWithBanner()
    const banner = simulation.queries.banners.entities[0]!
    banner.health.current = 0
    ctx.world.addComponent(banner, 'dead', true)
    banners.update()

    expect(herald.rally).toBeUndefined()
  })

  it('takes less damage at a protected tower', () => {
    const { ctx, tower, enemy } = heraldWithBanner('hold')
    const before = tower.health.current
    ctx.combat.dealDamage(enemy, tower, 100, 'magical')

    expect(before - tower.health.current).toBeCloseTo(100 * enemy.structureDamage! * standard.holdProtection)
  })
})

function stonewrightAtTower(stance?: LaneStance) {
  const battle = arena({
    ours: {
      mid: [
        {
          uid: 'mason',
          heroId: 'stonewright',
        },
      ],
    },
    stances: stance ? { mid: stance } : {},
  })

  const mason = battle.hero('mason')
  const tower = battle.structure(0, 'mid')
  tower.health.current = tower.health.max / 2

  Object.assign(mason.position, {
    x: tower.position.x + 40,
    y: tower.position.y,
  })

  mason.mana.current = mason.mana.max
  battle.ctx.index.sync()

  return {
    ...battle,
    mason,
    tower,
    abilities: new AbilitySystem(battle.ctx, ABILITIES),
    channels: new ChannelSystem(battle.ctx),
  }
}

function run(systems: { update(dt: number): void }[], seconds: number, each?: (time: number) => void) {
  for (let time = 0; time < seconds; time += STEP) {
    each?.(time)

    for (const system of systems) {
      system.update(STEP)
    }
  }
}

describe('Stonewright', () => {
  it('repairs a damaged tower nearby over the whole channel', () => {
    const { abilities, channels, mason, tower } = stonewrightAtTower()
    const before = tower.health.current
    run([abilities, channels], mend.duration + 0.5)

    expect(tower.health.current - before).toBeCloseTo(mend.repair * mend.duration)
    expect(mason.channel).toBeUndefined()

    /* Alone in mid it plays solo, which doubles its mana. */
    expect(mason.mana.current).toBeCloseTo(
      HEROES.stonewright.manaRegen! * mason.mana.gain * (mend.duration + 0.5),
      0,
    )
  })

  it('stands still and holds its attacks while channelling', () => {
    const { abilities, mason } = stonewrightAtTower()
    abilities.update(STEP)

    expect(mason.channel).toBeDefined()
    expect(mason.targeting.target).toBeNull()
  })

  it('is interrupted by a stun', () => {
    const { abilities, channels, mason, tower } = stonewrightAtTower()
    const before = tower.health.current
    run([abilities, channels], mend.duration + 0.5, (time) => {
      if (Math.abs(time - 1) < STEP / 2) {
        mason.status.stun = 1
      }
    })

    const repaired = tower.health.current - before
    expect(repaired).toBeGreaterThan(0)
    expect(repaired).toBeLessThan(mend.repair * mend.duration * 0.5)
  })

  it('keeps its mana when no building nearby needs repair', () => {
    const { abilities, mason, tower } = stonewrightAtTower()
    tower.health.current = tower.health.max
    abilities.update(STEP)

    expect(mason.channel).toBeUndefined()
    expect(mason.mana.current).toBe(mason.mana.max)
  })

  it('reclaims the round score only under Defence', () => {
    const scoreAfterRepair = (reclaims: boolean) => {
      const events = mitt<SimulationEvents>()
      const recorder = new BattleStatsRecorder(events)

      const structure = {
        team: 0,
        structure: {
          type: 'tower',
          lane: 'mid',
          slot: 'mid',
        },
      } as Unit

      events.emit('structureDamaged', {
        structure,
        amount: 300,
        attackerTeam: 1,
      })

      events.emit('repaired', {
        structure,
        healer: {} as HeroUnit,
        amount: 120,
        reclaims,
      })

      events.emit('repaired', {
        structure,
        healer: {} as HeroUnit,
        amount: 500,
        reclaims,
      })

      return recorder.snapshot()[1].structureDamage.mid
    }

    expect(scoreAfterRepair(false)).toBe(300)
    expect(scoreAfterRepair(true)).toBe(0)
  })

  it('channels with the Defence order in a real lane and records it', () => {
    const { abilities, channels, mason } = stonewrightAtTower('hold')
    abilities.update(STEP)

    expect(mason.channel?.reclaims).toBe(true)
    run([channels], mend.duration)
    expect(mason.hero.healing).toBeGreaterThan(0)
  })
})

describe('Changeling', () => {
  it('takes the role that switches on a synergy with its lane-mate', () => {
    expect(laneRoles('top', ['archer', 'changeling'], 'threeLanes')).toEqual(['carry', 'support'])
    expect(laneRoles('top', ['pyromancer', 'changeling'], 'threeLanes')).toEqual(['mage', 'mage'])
    expect(laneRoles('top', ['rogue', 'changeling'], 'threeLanes')).toEqual(['ganker', 'initiator'])
  })

  it('keeps its own role when no role adds a synergy', () => {
    expect(laneRoles('mid', ['changeling'], 'threeLanes')).toEqual(['carry'])
    expect(resolveLane('mid', ['changeling'], 'threeLanes').synergies).toEqual(['soloMid'])
  })

  it('never takes a role that switches on fewer synergies than its own', () => {
    for (const mate of HERO_IDS) {
      const lane = ['changeling', mate] as const
      const adapted = resolveLane('top', lane, 'twoLanes').synergies.length
      const plain = resolveLane('top', [mate], 'twoLanes').synergies.length

      expect(adapted).toBeGreaterThanOrEqual(plain)
    }
  })

  it('fights in the role it took and casts that role’s signature ability', () => {
    const { ctx, hero } = arena({
      ours: {
        top: [
          {
            uid: 'archer',
            heroId: 'archer',
          },
          {
            uid: 'mimic',
            heroId: 'changeling',
          },
        ],
      },
    })

    const mimic = hero('mimic')
    const archer = hero('archer')
    expect(mimic.hero.role).toBe('support')
    expect(mimic.healAura).toBeDefined()

    archer.health.current = archer.health.max / 3
    Object.assign(mimic.position, { ...archer.position })
    ctx.index.sync()

    const before = archer.health.current
    expect(ABILITIES.mimic.cast(mimic, ctx)).toBe(true)
    expect(archer.health.current).toBeGreaterThan(before)
  })

  it('is rare: too few copies for a third star', () => {
    const pool = new HeroPool()

    expect(HEROES.changeling.copies).toBeLessThan(9)
    expect(pool.available('changeling')).toBe(HEROES.changeling.copies)
    expect(pool.available('giant')).toBeGreaterThan(pool.available('changeling'))
  })
})
