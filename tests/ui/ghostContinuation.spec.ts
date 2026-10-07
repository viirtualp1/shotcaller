// @vitest-environment happy-dom
import { createPinia, disposePinia, getActivePinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMatch } from '@/application/createMatch'
import { continueGhostBoard } from '@/application/social/ghostContinuation'
import { sequentialIds } from '@/core/ids'
import { useMatchStore, type DuelBinding } from '@/ui/stores/match'

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
})

afterEach(() => {
  disposePinia(getActivePinia()!)
  localStorage.clear()
})

describe('ghost continuation in the match store', () => {
  it.each([3, 4])('commits round %s before revealing the recording or continuing coach', async (round) => {
    const seed = 'ghost-store'

    const match = createMatch({
      mode: 'oneLane',
      seed: 'human-shop',
      ids: sequentialIds('human'),
      link: {
        seed,
        side: 0,
      },
    })

    const purchase = match.human.buy(0)._unsafeUnwrap()
    match.human.move(purchase.hero.uid, 'mid')._unsafeUnwrap()
    const anchor = match.opponent.snapshot()

    const previous = {
      ...anchor,
      gold: 30,
    }

    const state = {
      ...match.snapshot(),
      round,
      players: [match.human.snapshot(), previous] as const,
    }

    let release!: () => void

    const committed = new Promise<void>((resolve) => {
      release = resolve
    })

    const binding: DuelBinding = {
      id: 'ghost',
      opponentName: 'Ghost',
      ranked: true,
      ghost: true,
      ghostRounds: 3,
      exchange: vi.fn(async () => {
        await committed

        return anchor
      }),
      finish: vi.fn(),
    }

    const store = useMatchStore()
    store.resumeDuel(binding, state)
    store.startBattle()
    expect(binding.exchange).toHaveBeenCalledWith(round, state.players[0])
    expect(store.phase).toBe('planning')
    expect(store.awaiting).toBe(true)
    release()
    await vi.waitFor(() => expect(store.phase).toBe('battle'))
    const saved = store.savedDuel(seed)!
    const expected = round > 3 ? continueGhostBoard(previous, 'oneLane', seed, round) : anchor
    expect(saved.players[1]).toEqual(expected)
    expect(saved.battle!.lineups[1]).toEqual(expected.roster.lanes)
    store.leaveToMenu()
  })
})
