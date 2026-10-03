import { createPinia, disposePinia, getActivePinia, setActivePinia } from 'pinia'
import { nextTick, reactive, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DuelError, NO_PAUSE, type DuelEntry, type DuelService } from '@/application/social/duels'
import type { DuelBinding } from '@/ui/stores/match'
import { useDuelStore } from '@/ui/stores/duel'

const intervals = new Map<number, () => Promise<void> | void>()

const cloud = reactive({
  signedIn: true,
  account: { id: 'host' },
  connect: vi.fn(),
  syncNow: vi.fn(async () => undefined),
})

const match = reactive({
  isDuel: false,
  awaiting: false,
  view: null,
  duelPausedAt: null,
  setDuelPaused: vi.fn(),
  startDuel: vi.fn<(binding: DuelBinding) => void>(),
  settleDuel: vi.fn(),
  leaveToMenu: vi.fn(),
})

const notifications = { push: vi.fn() }
vi.mock('@/ui/stores/cloud', () => ({ useCloudStore: () => cloud }))
vi.mock('@/ui/stores/match', () => ({ useMatchStore: () => match }))
vi.mock('@/ui/stores/notifications', () => ({ useNotificationsStore: () => notifications }))

vi.mock('@vueuse/core', async (original) => ({
  ...(await original<typeof import('@vueuse/core')>()),
  useEventListener: vi.fn(() => vi.fn()),
  useOnline: () => ref(true),
  useDocumentVisibility: () => ref('visible'),
  useIntervalFn: (callback: () => Promise<void> | void, ms: number) => {
    intervals.set(ms, callback)

    return {
      pause: vi.fn(),
      resume: vi.fn(),
      isActive: ref(true),
    }
  },
}))

const entry = (status: 'invited' | 'active' = 'active'): DuelEntry => ({
  duel: {
    id: 'duel',
    host: 'host',
    guest: 'guest',
    status,
    mode: 'threeLanes',
    seed: 'seed',
    round: 1,
    roundOpenedAt: new Date().toISOString(),
    boardRounds: [0, 0],
    winner: null,
    endedBy: null,
    createdAt: new Date().toISOString(),
    pause: NO_PAUSE,
  },
  opponent: {
    id: 'guest',
    name: 'Other coach',
    avatar: null,
    photo: null,
    rating: 1000,
  },
})

let service: DuelService
async function ready() {
  const duel = useDuelStore()
  for (let i = 0; i < 8; i++) {
    await Promise.resolve()
  }

  await nextTick()

  return duel
}

async function begun() {
  const duel = await ready()
  duel.outgoing = entry('invited')
  service.mine = vi.fn(async () => [entry('invited')])
  service.find = vi.fn(async () => entry().duel)
  await intervals.get(5000)!()

  return duel
}

describe('duel recovery polling', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    intervals.clear()
    vi.clearAllMocks()
    cloud.signedIn = true
    match.isDuel = false

    service = {
      findMatch: vi.fn(async () => null),
      leaveQueue: vi.fn(async () => null),
      invite: vi.fn(),
      respond: vi.fn(),
      cancel: vi.fn(),
      mine: vi.fn(async () => []),
      find: vi.fn(),
      submitBoard: vi.fn(),
      opponentBoard: vi.fn(),
      withdrawBoard: vi.fn(async () => true),
      report: vi.fn(async () => undefined),
      forfeit: vi.fn(),
      claim: vi.fn(),
      pause: vi.fn(),
      unpause: vi.fn(),
      watch: vi.fn(() => () => undefined),
      reactions: vi.fn(() => ({
        send: vi.fn(),
        leave: vi.fn(),
      })),
    }

    cloud.connect.mockResolvedValue({ duels: () => service })
  })

  afterEach(() => disposePinia(getActivePinia()!))

  it('recovers a missed acceptance without restoring a stale invitation or restarting the match', async () => {
    const duel = await begun()
    expect(duel.active?.duel.id).toBe('duel')
    expect(duel.outgoing).toBeNull()
    expect(match.startDuel).toHaveBeenCalledTimes(1)
    await intervals.get(5000)!()
    expect(match.startDuel).toHaveBeenCalledTimes(1)
  })

  it('observes a forfeit after its realtime notification was missed', async () => {
    const duel = await begun()
    service.find = vi.fn(async () => ({
      ...entry().duel,
      status: 'finished' as const,
      winner: 'host',
      endedBy: 'forfeit' as const,
    }))

    await intervals.get(5000)!()
    expect(duel.active).toBeNull()

    expect(match.settleDuel).toHaveBeenCalledWith({
      id: 'duel',
      seed: 'seed',
      opponentName: 'Other coach',
      won: true,
    })

    expect(notifications.push).toHaveBeenCalledWith({
      kind: 'duelEnded',
      how: 'forfeit',
      won: true,
    })
  })

  it('retries the final result after a transient network failure', async () => {
    await begun()
    service.report = vi.fn().mockRejectedValueOnce(new DuelError('failed')).mockResolvedValueOnce(undefined)
    const binding = match.startDuel.mock.calls[0]![0] as DuelBinding
    binding.finish({
      winner: 0,
      reason: 'roundLimit',
    })

    await Promise.resolve()
    await intervals.get(5000)!()
    expect(service.report).toHaveBeenCalledTimes(2)
    expect(service.report).toHaveBeenLastCalledWith('duel', 0, false)
    expect(notifications.push).not.toHaveBeenCalled()
  })

  it('keeps retrying a final result after the player leaves the match screen', async () => {
    const duel = await begun()
    match.isDuel = true
    await nextTick()
    service.report = vi.fn().mockRejectedValueOnce(new DuelError('failed')).mockResolvedValueOnce(undefined)
    const binding = match.startDuel.mock.calls[0]![0]
    binding.finish({
      winner: 0,
      reason: 'roundLimit',
    })

    await Promise.resolve()
    match.isDuel = false
    await nextTick()

    expect(duel.active?.duel.id).toBe('duel')
    await intervals.get(5000)!()
    expect(service.report).toHaveBeenLastCalledWith('duel', 0, false)
    expect(service.report).toHaveBeenCalledTimes(2)
    expect(duel.active).toBeNull()
  })

  it('renews a search until paired and starts the returned match once', async () => {
    const duel = await ready()
    service.findMatch = vi.fn().mockResolvedValueOnce(null).mockResolvedValue('duel')
    await duel.search('threeLanes')
    expect(duel.searching).toBe('threeLanes')
    expect(duel.matchmaking).toBe(true)
    expect(duel.searchMode).toBe('threeLanes')
    service.mine = vi.fn(async () => [entry()])
    await intervals.get(5000)!()

    expect(duel.searching).toBeNull()
    expect(duel.matchmaking).toBe(false)
    expect(duel.searchMode).toBeNull()
    expect(match.startDuel).toHaveBeenCalledTimes(1)
    await intervals.get(5000)!()
    expect(match.startDuel).toHaveBeenCalledTimes(1)
  })

  it('waits for an in-flight search before cancellation and keeps a pairing that already happened', async () => {
    const duel = await ready()
    let answer!: (id: string | null) => void
    service.findMatch = vi.fn(
      () =>
        new Promise<string | null>((resolve) => {
          answer = resolve
        }),
    )

    const searching = duel.search('twoLanes')
    const cancelling = duel.cancelSearch()
    expect(service.leaveQueue).not.toHaveBeenCalled()
    service.mine = vi.fn(async () => [entry()])
    service.leaveQueue = vi.fn(async () => 'duel')
    answer('duel')
    await Promise.all([searching, cancelling])

    expect(service.leaveQueue).toHaveBeenCalledTimes(1)
    expect(duel.searching).toBeNull()
    expect(match.startDuel).toHaveBeenCalledTimes(1)
  })

  it('recovers the queue pairing when the find response failed after the server paired it', async () => {
    const duel = await ready()
    service.findMatch = vi.fn().mockRejectedValueOnce(new DuelError('failed')).mockResolvedValue('duel')
    await duel.search('oneLane')
    expect(duel.searching).toBe('oneLane')
    service.mine = vi.fn(async () => [entry()])
    await intervals.get(5000)!()

    expect(match.startDuel).toHaveBeenCalledTimes(1)
    expect(notifications.push).not.toHaveBeenCalled()
  })

  it('retries a failed cancellation and recovers a pairing committed before it', async () => {
    const duel = await ready()
    await duel.search('threeLanes')
    service.leaveQueue = vi.fn().mockRejectedValueOnce(new DuelError('failed')).mockResolvedValueOnce('duel')
    await duel.cancelSearch()

    expect(duel.searching).toBeNull()
    expect(duel.cancellingSearch).toBe(true)
    expect(duel.matchmaking).toBe(true)
    expect(duel.searchMode).toBe('threeLanes')
    service.mine = vi.fn(async () => [entry()])
    await intervals.get(5000)!()

    expect(service.leaveQueue).toHaveBeenCalledTimes(2)
    expect(duel.cancellingSearch).toBe(false)
    expect(duel.matchmaking).toBe(false)
    expect(match.startDuel).toHaveBeenCalledTimes(1)
  })

  it('keeps the mode and game controls locked while recovering a match found during cancellation', async () => {
    const duel = await ready()
    await duel.search('twoLanes')
    service.leaveQueue = vi.fn(async () => 'duel')
    service.mine = vi.fn().mockRejectedValueOnce(new DuelError('failed')).mockResolvedValueOnce([entry()])
    await duel.cancelSearch()

    expect(duel.matchmaking).toBe(true)
    expect(duel.busy).toBe(true)
    expect(duel.searchMode).toBe('twoLanes')
    await duel.search('oneLane')
    expect(service.findMatch).toHaveBeenCalledTimes(1)

    await intervals.get(5000)!()
    expect(duel.matchmaking).toBe(false)
    expect(duel.searchMode).toBeNull()
    expect(match.startDuel).toHaveBeenCalledTimes(1)
  })

  it('unlocks game controls after the server confirms cancellation without a pairing', async () => {
    const duel = await ready()
    await duel.search('oneLane')
    let answer!: (id: string | null) => void
    service.leaveQueue = vi.fn(
      () =>
        new Promise<string | null>((resolve) => {
          answer = resolve
        }),
    )

    const cancelling = duel.cancelSearch()
    await Promise.resolve()

    expect(duel.matchmaking).toBe(true)
    expect(duel.searchMode).toBe('oneLane')
    expect(duel.cancellingSearch).toBe(true)
    answer(null)
    await cancelling

    expect(duel.matchmaking).toBe(false)
    expect(duel.searchMode).toBeNull()
    expect(duel.busy).toBe(false)
  })

  it('does not start a returned pairing after switching accounts', async () => {
    const duel = await ready()
    let answer!: (id: string | null) => void
    service.findMatch = vi.fn(
      () =>
        new Promise<string | null>((resolve) => {
          answer = resolve
        }),
    )

    const searching = duel.search('twoLanes')
    cloud.signedIn = false
    await nextTick()
    answer('duel')
    await searching

    expect(duel.searching).toBeNull()
    expect(match.startDuel).not.toHaveBeenCalled()
  })
})
