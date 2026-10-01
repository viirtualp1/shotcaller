import { describe, expect, it } from 'vitest'
import { createMatch } from '@/application/createMatch'
import { parseSnapshot, serializeSnapshot } from '@/application/persistence/snapshot'
import { toMatchView } from '@/application/views'
import { sequentialIds } from '@/core/ids'
import { createRng } from '@/core/random/rng'
import { GreedyCoach } from '@/domain/coach/GreedyCoach'
import { verdictFor } from '@/domain/match/judge'
import { headlessResolver } from '@/simulation/BattleSimulation'

const FULL_MATCH_TIMEOUT = 15_000

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

  it('keeps one row per hero type and team', () => {
    const { stats } = playOut('rows', 4)
    const keys = stats.heroes.map((h) => `${h.team}:${h.heroId}`)

    expect(new Set(keys).size).toBe(keys.length)
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
