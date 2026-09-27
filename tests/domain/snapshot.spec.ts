import { describe, expect, it } from 'vitest'
import { createMatch, restoreMatch } from '@/application/createMatch'
import { parseSnapshot, serializeSnapshot } from '@/application/persistence/snapshot'
import { toMatchView } from '@/application/views'
import { sequentialIds } from '@/core/ids'
import { createRng } from '@/core/random/rng'
import { GreedyCoach } from '@/domain/coach/GreedyCoach'
import { headlessResolver } from '@/simulation/BattleSimulation'

function playedMatch() {
  const match = createMatch({ seed: 'save', ids: sequentialIds('save') })
  const coach = new GreedyCoach()
  const rng = createRng('save-coach')
  for (let i = 0; i < 3; i++) {
    coach.playTurn(match.human, { round: match.round, rng })
    match.finishBattle(headlessResolver.resolve(match.startBattle()._unsafeUnwrap()))
    match.nextRound()
  }
  match.human.buyItem('boots')
  return match
}

describe('match snapshots', () => {
  it('restores the exact visible state', () => {
    const original = playedMatch()
    const restored = restoreMatch(parseSnapshot(serializeSnapshot(original.snapshot()))!, {
      ids: sequentialIds('restored'),
    })
    expect(toMatchView(restored)).toEqual(toMatchView(original))
  })

  it('continues the same random stream after loading', () => {
    const original = playedMatch()
    const restored = restoreMatch(parseSnapshot(serializeSnapshot(original.snapshot()))!, {
      ids: sequentialIds('restored'),
    })
    original.human.reroll()
    restored.human.reroll()
    expect(restored.human.shop.slots).toEqual(original.human.shop.slots)
  })

  it('keeps an unfinished battle so it can be replayed', () => {
    const match = playedMatch()
    const setup = match.startBattle()._unsafeUnwrap()
    const restored = restoreMatch(parseSnapshot(serializeSnapshot(match.snapshot()))!, {
      ids: sequentialIds('restored'),
    })
    expect(restored.phase).toBe('battle')
    expect(restored.pendingBattle).toEqual(setup)
    expect(headlessResolver.resolve(restored.pendingBattle!)).toEqual(headlessResolver.resolve(setup))
  })

  it('rejects corrupted data', () => {
    expect(parseSnapshot('{"version":1,"round":"three"}')).toBeNull()
    expect(parseSnapshot('not json')).toBeNull()
  })
})
