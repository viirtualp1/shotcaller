import { describe, expect, it } from 'vitest'
import { createMatch, restoreMatch } from '@/application/createMatch'
import { parseSnapshot, serializeSnapshot } from '@/application/persistence/snapshot'
import { toMatchView } from '@/application/views'
import { sequentialIds } from '@/core/ids'
import { createRng } from '@/core/random/rng'
import { GreedyCoach } from '@/domain/coach/GreedyCoach'
import { headlessResolver } from '@/simulation/BattleSimulation'

/** These play several rounds first, alongside the rest of the suite. */
const PLAYED_MATCH_TIMEOUT = 20_000

function playedMatch() {
  const match = createMatch({
    seed: 'save',
    ids: sequentialIds('save'),
  })

  const coach = new GreedyCoach()
  const rng = createRng('save-coach')
  for (let i = 0; i < 3; i++) {
    coach.playTurn(match.human, {
      round: match.round,
      rng,
    })

    match.finishBattle(headlessResolver.resolve(match.startBattle()._unsafeUnwrap()))
    match.nextRound()
  }

  match.human.buyItem('boots')

  return match
}

describe('match snapshots', () => {
  it('restores the exact visible state', { timeout: PLAYED_MATCH_TIMEOUT }, () => {
    const original = playedMatch()

    const restored = restoreMatch(parseSnapshot(serializeSnapshot(original.snapshot()))!, {
      ids: sequentialIds('restored'),
    })

    expect(toMatchView(restored)).toEqual(toMatchView(original))
  })

  it('continues the same random stream after loading', { timeout: PLAYED_MATCH_TIMEOUT }, () => {
    const original = playedMatch()

    const restored = restoreMatch(parseSnapshot(serializeSnapshot(original.snapshot()))!, {
      ids: sequentialIds('restored'),
    })

    original.human.reroll()
    restored.human.reroll()
    expect(restored.human.shop.slots).toEqual(original.human.shop.slots)
  })

  it('keeps an unfinished battle so it can be replayed', { timeout: PLAYED_MATCH_TIMEOUT }, () => {
    const match = playedMatch()
    const setup = match.startBattle()._unsafeUnwrap()

    const restored = restoreMatch(parseSnapshot(serializeSnapshot(match.snapshot()))!, {
      ids: sequentialIds('restored'),
    })

    expect(restored.phase).toBe('battle')
    expect(restored.pendingBattle).toEqual(setup)
    expect(headlessResolver.resolve(restored.pendingBattle!)).toEqual(headlessResolver.resolve(setup))
  })

  it('loads a save from before game modes as three lanes, with levels counted from 1', () => {
    const saved = JSON.parse(serializeSnapshot(playedMatch().snapshot()))
    const level = saved.state.players[0].level
    delete saved.state.mode
    saved.version = 1
    saved.state.players[0].level = level + 1

    const state = parseSnapshot(JSON.stringify(saved))!
    expect(state.mode).toBe('threeLanes')
    expect(state.players[0].level).toBe(level)
  })

  it('rejects corrupted data', () => {
    expect(parseSnapshot('{"version":1,"round":"three"}')).toBeNull()
    expect(parseSnapshot('not json')).toBeNull()
  })
})
