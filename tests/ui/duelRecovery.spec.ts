import { createPinia, disposePinia, getActivePinia, setActivePinia } from 'pinia'
import { nextTick, reactive, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DuelError, type DuelEntry, type DuelService } from '@/application/social/duels'
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
    match.isDuel = false

    service = {
      invite: vi.fn(),
      respond: vi.fn(),
      cancel: vi.fn(),
      mine: vi.fn(async () => []),
      find: vi.fn(),
      submitBoard: vi.fn(),
      opponentBoard: vi.fn(),
      report: vi.fn(async () => undefined),
      forfeit: vi.fn(),
      claim: vi.fn(),
      watch: vi.fn(() => () => undefined),
      watchBoards: vi.fn(() => () => undefined),
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
})
