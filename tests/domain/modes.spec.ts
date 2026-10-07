import { describe, expect, it } from 'vitest'
import { createMatch } from '@/application/createMatch'
import { parseRemoteBoard } from '@/application/persistence/snapshot'
import { MODE_IDS, type HeroId, type LaneId, type ModeId } from '@/content/ids'
import { MODES } from '@/content/modes'
import { sequentialIds } from '@/core/ids'
import { createRng } from '@/core/random/rng'
import { GreedyCoach } from '@/domain/coach/GreedyCoach'
import { judgeRound } from '@/domain/match/judge'
import { emptyStructureState, freshStructures } from '@/domain/match/structures'
import type { Lineup } from '@/domain/roster/Roster'
import { BattleSimulation, headlessResolver } from '@/simulation/BattleSimulation'
import { laneMapFor } from '@/simulation/map/LaneMap'

/** A whole match, run alongside the rest of the suite. */
const FULL_MATCH_TIMEOUT = 30_000

function lineup(prefix: string, lanes: Partial<Record<LaneId, HeroId[]>>): Lineup {
  const build = (lane: LaneId) =>
    (lanes[lane] ?? []).map((heroId, i) => ({
      uid: `${prefix}-${lane}-${i}`,
      heroId,
      stars: 1 as const,
      items: [],
    }))

  return {
    top: build('top'),
    mid: build('mid'),
    bot: build('bot'),
  }
}

/** Plays a whole match with the computer on both sides. */
function playMatch(mode: ModeId, seed: string) {
  const match = createMatch({
    seed,
    ids: sequentialIds(seed),
    mode,
  })

  const coach = new GreedyCoach()
  const rng = createRng(`${seed}-human`)
  while (match.phase !== 'finished') {
    coach.playTurn(match.human, {
      round: match.round,
      rng,
    })

    match.finishBattle(headlessResolver.resolve(match.startBattle({ allowEmptyBoard: true })._unsafeUnwrap()))

    if (match.phase === 'summary') {
      match.nextRound()
    }
  }

  return match
}

describe('game modes', () => {
  it('builds a map for every mode with its own lanes and towers', () => {
    for (const mode of MODE_IDS) {
      const map = laneMapFor(mode)
      expect(map.lanes).toEqual(MODES[mode].lanes)

      for (const slot of MODES[mode].towers) {
        const own = map.towerPosition(0, slot)
        const enemy = map.towerPosition(1, slot)
        expect(Math.hypot(own.x - enemy.x, own.y - enemy.y)).toBeGreaterThan(200)
      }
    }
  })

  it('starts the fallen towers of lanes the mode does not have', () => {
    expect(freshStructures('twoLanes')).toMatchObject({
      top: 1600,
      mid: 0,
      bot: 1600,
      inner: 0,
    })

    expect(freshStructures('oneLane')).toMatchObject({
      top: 0,
      mid: 1600,
      bot: 0,
      inner: 1600,
    })
  })

  it('spawns the towers, heroes and creeps of the mode only', () => {
    const sim = new BattleSimulation({
      mode: 'oneLane',
      round: 4,
      seed: 'one-lane',
      lineups: [lineup('a', { mid: ['giant', 'archer'] }), lineup('b', { mid: ['spearman', 'acolyte'] })],
      structures: [freshStructures('oneLane'), freshStructures('oneLane')],
    })

    const towers = sim.queries.structures.entities.filter((s) => s.structure.type === 'tower')
    expect(towers.map((t) => t.structure.slot).sort()).toEqual(['inner', 'inner', 'mid', 'mid'])

    sim.step()
    sim.step()
    const outcome = sim.runToEnd()
    expect(outcome.structures[0].top).toBe(0)
    expect(outcome.structures[0].bot).toBe(0)
  })

  it('heals heroes who step on a relic, and only on the one-lane map', () => {
    const run = (mode: ModeId) => {
      const lanes = mode === 'oneLane' ? { mid: ['giant', 'butcher', 'blademaster'] as HeroId[] } : {}

      const sim = new BattleSimulation({
        mode,
        round: 8,
        seed: 'relics',
        lineups: [lineup('a', lanes), lineup('b', lanes)],
        structures: [freshStructures(mode), freshStructures(mode)],
      })

      let bursts = 0
      sim.events.on('burst', ({ color }) => {
        bursts += color === 0x7fe0b4 ? 1 : 0
      })

      sim.runToEnd()

      return {
        relics: sim.relics.length,
        bursts,
      }
    }

    expect(run('oneLane').relics).toBe(2)
    expect(run('oneLane').bursts).toBeGreaterThan(0)
    expect(run('threeLanes').relics).toBe(0)
  })

  it(
    'ends a one-lane match by the round limit of the mode at the latest',
    { timeout: FULL_MATCH_TIMEOUT },
    () => {
      const match = playMatch('oneLane', 'short')
      expect(match.round).toBeLessThanOrEqual(MODES.oneLane.maxRounds)
      expect(match.stats.lineups).toHaveLength(match.round)
      expect(match.stats.lineups.at(-1)![0].every(([, , lane]) => lane === 'mid')).toBe(true)
    },
  )

  it('starts every mode at level 1, with the heroes on the map the mode allows', () => {
    const board = (mode: ModeId) =>
      createMatch({
        seed: 'levels',
        mode,
      }).human

    expect(board('threeLanes').level).toBe(1)
    expect(board('threeLanes').boardCapacity).toBe(2)
    expect(board('twoLanes').boardCapacity).toBe(2)
    expect(board('oneLane').level).toBe(1)
    expect(board('oneLane').boardCapacity).toBe(3)
    expect(MODES.oneLane.levels.at(-1)!.board).toBe(5)
  })

  it('decides a round without building damage by hero kills, by a wider gap with more lanes', () => {
    const stats = (heroKills: number) => ({
      heroKills,
      creepKills: 0,
      structureDamage: emptyStructureState(),
    })

    const outcome = {
      structures: [freshStructures(), freshStructures()] as const,
      stats: [stats(3), stats(1)] as const,
      throneFell: null,
      heroes: [],
    }

    expect(judgeRound(outcome, 'oneLane')).toBe(0)
    expect(judgeRound(outcome, 'threeLanes')).toBe(0)

    /* One kill more is a draw on the wider maps, where a kill is worth less. */
    const close = {
      ...outcome,
      stats: [stats(2), stats(1)] as const,
    }

    expect(judgeRound(close, 'oneLane')).toBe(0)
    expect(judgeRound(close, 'threeLanes')).toBeNull()
  })

  it('keeps heroes off lanes the mode does not have', () => {
    const match = createMatch({
      seed: 'closed',
      mode: 'twoLanes',
    })

    match.human.wallet.earn(10)
    match.human.buy(0)
    const hero = match.human.roster.bench[0]!

    expect(match.human.move(hero.uid, 'mid').isErr()).toBe(true)
    expect(match.human.move(hero.uid, 'top').isOk()).toBe(true)

    const board = match.human.snapshot()
    expect(parseRemoteBoard(board, 'twoLanes')).not.toBeNull()
    expect(parseRemoteBoard(board, 'oneLane')).toBeNull()
  })
})
