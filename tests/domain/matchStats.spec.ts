import { describe, expect, it } from 'vitest'
import { createMatch } from '@/application/createMatch'
import { parseSnapshot, serializeSnapshot } from '@/application/persistence/snapshot'
import { sequentialIds } from '@/core/ids'
import { createRng } from '@/core/random/rng'
import { GreedyCoach } from '@/domain/coach/GreedyCoach'
import { headlessResolver } from '@/simulation/BattleSimulation'

function playOut(seed: string) {
  const match = createMatch({
    seed,
    ids: sequentialIds(),
  })

  const coach = new GreedyCoach()
  const rng = createRng(`${seed}-coach`)
  while (match.phase !== 'finished') {
    coach.playTurn(match.human, {
      round: match.round,
      rng,
    })

    match.finishBattle(headlessResolver.resolve(match.startBattle()._unsafeUnwrap()))
    match.nextRound()
  }

  return match
}

describe('match statistics', () => {
  it('adds up every round of the match', () => {
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
    const { stats } = playOut('rows')
    const keys = stats.heroes.map((h) => `${h.team}:${h.heroId}`)

    expect(new Set(keys).size).toBe(keys.length)
  })

  it('books what each coach bought', () => {
    const match = playOut('ledger')

    for (const player of match.players) {
      expect(player.ledger.heroesBought).toBeGreaterThan(0)
      expect(player.ledger.goldSpent).toBeGreaterThan(0)
    }
  })

  it('survives a save and load', () => {
    const match = playOut('saved')
    const restored = parseSnapshot(serializeSnapshot(match.snapshot()))!

    expect(restored.stats).toEqual(match.stats)
    expect(restored.players[0].ledger).toEqual(match.human.ledger)
  })
})
