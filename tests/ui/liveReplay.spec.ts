import { createPinia, disposePinia, getActivePinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMatch } from '@/application/createMatch'
import type { LiveMatch } from '@/application/social/liveMatch'
import { liveMatchOf } from '@/domain/replay/live'
import { useReplayStore } from '@/ui/stores/replay'

let poll: () => void
vi.mock('@vueuse/core', () => ({
  useIntervalFn: (callback: () => void) => {
    poll = callback
  },
}))

async function settle() {
  for (let i = 0; i < 5; i++) {
    await Promise.resolve()
  }
}

function snapshot() {
  const match = createMatch({ seed: 'live-store' })
  match.startBattle({ allowEmptyBoard: true })._unsafeUnwrap()

  return liveMatchOf(match, 'standard', 'live-store', 4)
}

beforeEach(() => setActivePinia(createPinia()))
afterEach(() => disposePinia(getActivePinia()!))

describe('watching a live match', () => {
  it('polls new battle progress, locks round selection and ends when access disappears', async () => {
    const replay = useReplayStore()
    const first = snapshot()
    const load = vi.fn().mockResolvedValue(first)
    replay.openLive('friend', load)
    await settle()
    expect(replay.liveStatus).toBe('watching')
    expect(replay.live?.elapsed).toBe(4)

    const second = {
      ...first,
      round: 2,
      elapsed: 8,
      record: {
        ...first.record,
        replays: [...first.record.replays, ...first.record.replays],
        roundLineups: [...first.record.roundLineups, ...first.record.roundLineups],
      },
    }

    load.mockResolvedValueOnce(second)
    poll()
    await settle()
    expect(replay.live?.elapsed).toBe(8)
    replay.selectRound(1)
    expect(replay.round).toBe(2)

    load.mockResolvedValueOnce(null)
    poll()
    await settle()
    expect(replay.liveStatus).toBe('ended')
    expect(replay.live).toBeNull()
    const calls = load.mock.calls.length
    poll()
    expect(load).toHaveBeenCalledTimes(calls)
  })

  it('retries transport errors and ignores responses after closing', async () => {
    const replay = useReplayStore()
    const load = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(snapshot())
    replay.openLive('friend', load)
    await settle()
    expect(replay.liveStatus).toBe('error')
    poll()
    await settle()
    expect(replay.liveStatus).toBe('watching')

    let resolve!: (value: LiveMatch) => void
    replay.openLive(
      'other',
      () =>
        new Promise<LiveMatch>((done) => {
          resolve = done
        }),
    )

    replay.close()
    resolve(snapshot())
    await settle()
    expect(replay.match).toBeNull()
    expect(replay.liveStatus).toBe('off')
  })

  it('stops live polling when an ordinary replay is opened', async () => {
    const replay = useReplayStore()
    const load = vi.fn().mockResolvedValue(snapshot())
    replay.openLive('friend', load)
    await settle()
    replay.open(snapshot().record)
    poll()

    expect(replay.liveFriend).toBeNull()
    expect(replay.liveStatus).toBe('off')
    expect(load).toHaveBeenCalledOnce()
  })

  it('rejects a broadcast played with incompatible combat rules', async () => {
    const replay = useReplayStore()
    const live = snapshot()

    const load = vi.fn().mockResolvedValue({
      ...live,
      record: {
        ...live.record,
        balance: 'older-rules',
      },
    })

    replay.openLive('friend', load)
    await settle()

    expect(replay.liveStatus).toBe('incompatible')
    expect(replay.match).toBeNull()
    poll()
    expect(load).toHaveBeenCalledOnce()
  })
})
