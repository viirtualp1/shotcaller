import { describe, expect, it } from 'vitest'
import { createMatch } from '@/application/createMatch'
import { parseSnapshot, serializeSnapshot } from '@/application/persistence/snapshot'
import { toMatchView } from '@/application/views'
import { sequentialIds } from '@/core/ids'
import { createRng } from '@/core/random/rng'
import { GreedyCoach } from '@/domain/coach/GreedyCoach'
import type { HeroBattleReport } from '@/domain/battle/contracts'
import { verdictFor } from '@/domain/match/judge'
import { addRound, emptyMatchStats } from '@/domain/match/matchStats'
import { headlessResolver } from '@/simulation/BattleSimulation'

/* Whole matches run alongside the rest of the suite; 9.0's larger pool and talents made them longer on CI. */
const FULL_MATCH_TIMEOUT = 30_000

const emptyIncome = {
  base: 0,
  interest: 0,
  farm: 0,
  win: 0,
  total: 0,
}

function prepareMatch(seed: string) {
  const match = createMatch({
    seed,
    ids: sequentialIds(),
  })

  const coach = new GreedyCoach()
  const rng = createRng(`${seed}-coach`)

  coach.playTurn(match.human, {
    round: match.round,
    rng,
  })

  return {
    match,
    coach,
    rng,
  }
}

function playOut(seed: string, rounds = Infinity) {
  const { match, coach, rng } = prepareMatch(seed)

  while (match.phase !== 'finished' && match.stats.rounds < rounds) {
    match.finishBattle(headlessResolver.resolve(match.startBattle()._unsafeUnwrap()))
    match.nextRound()

    if (match.phase === 'planning' && match.stats.rounds < rounds) {
      coach.playTurn(match.human, {
        round: match.round,
        rng,
      })
    }
  }

  return match
}

describe('match statistics', () => {
  // Plays a whole match: since thrones are defended (v5) this seed goes all 20 rounds instead of ending
  // in round 7, which takes about as long as vitest's default 5 s timeout.
  it('adds up every round of the match', { timeout: FULL_MATCH_TIMEOUT }, () => {
    const match = playOut('stats')
    const { stats } = match
    const [ours, theirs] = stats.teams

    expect(stats.rounds).toBe(match.round)
    expect(ours.roundsWon + theirs.roundsWon + stats.draws).toBe(stats.rounds)

    expect(ours.income.total).toBe(
      ours.income.base + ours.income.interest + ours.income.farm + ours.income.win,
    )

    const heroKills = stats.heroes.filter((h) => h.team === 0).reduce((sum, h) => sum + h.kills, 0)
    expect(heroKills).toBeLessThanOrEqual(ours.heroKills)
  })

  it('keeps one row per hero fielded, adding up its rounds', () => {
    const { stats } = playOut('rows', 4)
    const keys = stats.heroes.map((h) => `${h.team}:${h.uid}`)

    expect(new Set(keys).size).toBe(keys.length)
    expect(stats.heroes.every((h) => h.uid && h.lane)).toBe(true)
    expect(Math.max(...stats.heroes.map((h) => h.rounds))).toBeGreaterThan(1)
  })

  it('keeps two copies of a hero apart', () => {
    const report = (uid: string, lane: 'top' | 'bot', damageDealt: number): HeroBattleReport => ({
      uid,
      team: 0,
      heroId: 'archer',
      stars: 1,
      lane,
      items: [],
      damageDealt,
      damageReceived: 0,
      structureDamage: 0,
      healing: 0,
      lastHits: 0,
      kills: 0,
      deaths: 0,
    })

    const outcome = headlessResolver.resolve(prepareMatch('twins').match.startBattle()._unsafeUnwrap())

    const stats = addRound(
      emptyMatchStats(),
      {
        ...outcome,
        heroes: [report('a', 'top', 100), report('b', 'bot', 40)],
      },
      null,
      [emptyIncome, emptyIncome],
      [[], []],
      {
        seed: 'twins',
        structures: outcome.structures,
      },
    )

    expect(stats.heroes.map((h) => [h.uid, h.lane, h.damageDealt])).toEqual([
      ['a', 'top', 100],
      ['b', 'bot', 40],
    ])
  })

  it('books what each coach bought', () => {
    const { match } = prepareMatch('ledger')

    for (const player of match.players) {
      expect(player.ledger.heroesBought).toBeGreaterThan(0)
      expect(player.ledger.goldSpent).toBeGreaterThan(0)
    }
  })

  it('remembers who took each round, in order', () => {
    const match = playOut('history', 4)
    const { winners, teams, draws } = match.stats

    expect(winners).toHaveLength(4)
    expect(winners.filter((w) => w === 0)).toHaveLength(teams[0].roundsWon)
    expect(winners.filter((w) => w === null)).toHaveLength(draws)
    expect(toMatchView(match).history).toEqual(winners.map((w) => verdictFor(0, w)))
  })

  it('loads saves made before round history was kept', () => {
    const match = playOut('old-save', 1)
    const saved = JSON.parse(serializeSnapshot(match.snapshot()))
    delete saved.state.stats.winners

    expect(parseSnapshot(JSON.stringify(saved))?.stats.winners).toEqual([])
  })

  it('survives a save and load', () => {
    const match = playOut('saved', 4)
    const restored = parseSnapshot(serializeSnapshot(match.snapshot()))!

    expect(restored.stats).toEqual(match.stats)
    expect(restored.players[0].ledger).toEqual(match.human.ledger)
  })
})
