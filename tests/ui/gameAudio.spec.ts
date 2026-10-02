import { effectScope, reactive, type EffectScope } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useGameAudio } from '@/ui/composables/useGameAudio'

interface AudioView {
  phase: 'planning' | 'battle' | 'summary' | 'finished'
  side: 0 | 1
  history: ('win' | 'loss' | 'draw')[]
  result: { winner: 0 | 1 | null } | null
}

interface AudioState {
  view: AudioView | null
  readonly phase: AudioView['phase'] | null
  battleSkipped: boolean
  simulation: {
    events: string
    queries: {
      structures: { entities: { structure: { type: string }; health: { current: number; max: number } }[] }
    }
  } | null
  live: { duration: number; elapsed: number } | null
}

const mocks = vi.hoisted(() => ({
  audio: {
    setMusic: vi.fn(),
    setMusicPaused: vi.fn(),
    bindSimulation: vi.fn(),
    playRoundResult: vi.fn(),
    stopRoundResult: vi.fn(),
    playMatchResult: vi.fn(),
    stopMatchResult: vi.fn(),
    dispose: vi.fn(),
  },
  match: null as AudioState | null,
  profile: { isOpen: false },
  replay: { match: null as object | null },
  patchNotes: { patch: null as object | null },
  pause: { paused: false },
  cleanup: () => {},
}))

vi.mock('@/ui/stores/audio', () => ({ useAudioStore: () => mocks.audio }))
vi.mock('@/ui/stores/match', () => ({ useMatchStore: () => mocks.match }))
vi.mock('@/ui/stores/profile', () => ({ useProfileStore: () => mocks.profile }))
vi.mock('@/ui/stores/replay', () => ({ useReplayStore: () => mocks.replay }))
vi.mock('@/ui/stores/patchNotes', () => ({ usePatchNotesStore: () => mocks.patchNotes }))
vi.mock('@/ui/stores/pause', () => ({ usePauseStore: () => mocks.pause }))

vi.mock('vue', async (importOriginal) => ({
  ...(await importOriginal<typeof import('vue')>()),
  onBeforeUnmount: (cleanup: () => void) => (mocks.cleanup = cleanup),
}))

const view = (phase: AudioView['phase'], extra: Partial<AudioView> = {}): AudioView => ({
  phase,
  side: 0,
  history: [],
  result: null,
  ...extra,
})

describe('match audio transitions', () => {
  let store: AudioState
  let scope: EffectScope

  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()

    store = reactive<AudioState>({
      view: null,
      get phase() {
        return this.view?.phase ?? null
      },
      battleSkipped: false,
      simulation: null,
      live: null,
    })

    mocks.match = store
    mocks.profile = reactive({ isOpen: false })
    mocks.replay = reactive({ match: null })
    mocks.patchNotes = reactive({ patch: null })
    mocks.pause = reactive({ paused: false })
    scope = effectScope()
    scope.run(useGameAudio)
  })

  afterEach(() => {
    mocks.cleanup()
    scope.stop()
    vi.useRealTimers()
  })

  it('holds music during a game pause without changing the selected track', () => {
    store.view = view('battle')
    const changes = mocks.audio.setMusic.mock.calls.length
    mocks.pause.paused = true
    expect(mocks.audio.setMusicPaused).toHaveBeenLastCalledWith(true)
    mocks.pause.paused = false
    expect(mocks.audio.setMusicPaused).toHaveBeenLastCalledWith(false)
    expect(mocks.audio.setMusic).toHaveBeenCalledTimes(changes)
  })

  it('plays preparation and battle music throughout their phases without restarting on live updates', () => {
    store.view = view('planning')
    expect(mocks.audio.setMusic).toHaveBeenLastCalledWith('preparation')
    store.view = view('battle')

    store.simulation = {
      events: 'round-one',
      queries: { structures: { entities: [] } },
    }

    store.live = {
      duration: 90,
      elapsed: 0,
    }

    expect(mocks.audio.setMusic).toHaveBeenLastCalledWith('battle')
    const changes = mocks.audio.setMusic.mock.calls.length

    for (let elapsed = 1; elapsed <= 60; elapsed++) {
      store.live = {
        duration: 90,
        elapsed,
      }
    }

    expect(mocks.audio.setMusic).toHaveBeenCalledTimes(changes)

    store.live = {
      duration: 90,
      elapsed: 73,
    }

    expect(mocks.audio.setMusic).toHaveBeenLastCalledWith('climax')
    store.view = view('summary', { history: ['win'] })
    expect(mocks.audio.setMusic).toHaveBeenLastCalledWith('preparation')
    expect(mocks.audio.playRoundResult).toHaveBeenLastCalledWith('win')
    store.simulation = null
    store.live = null
    store.view = view('planning', { history: ['win'] })
    expect(mocks.audio.setMusic).toHaveBeenLastCalledWith('preparation')
  })

  it('detaches sounds synchronously before skipped simulation events and suppresses its round jingle', () => {
    store.view = view('battle')

    store.simulation = {
      events: 'round-one',
      queries: { structures: { entities: [] } },
    }

    expect(mocks.audio.bindSimulation).toHaveBeenLastCalledWith('round-one', 0)
    store.battleSkipped = true
    expect(mocks.audio.bindSimulation).toHaveBeenLastCalledWith(undefined, 0)
    store.view = view('summary', { history: ['loss'] })
    expect(mocks.audio.playRoundResult).not.toHaveBeenCalled()
    store.battleSkipped = false
    store.view = view('planning', { history: ['loss'] })
    store.view = view('battle', { history: ['loss'] })
    expect(mocks.audio.bindSimulation).toHaveBeenLastCalledWith('round-one', 0)
    store.view = view('summary', { history: ['loss', 'win'] })
    expect(mocks.audio.playRoundResult).toHaveBeenLastCalledWith('win')
  })

  it.each(['win', 'loss'] as const)(
    'stops an already playing %s melody as soon as the report is left',
    (verdict) => {
      store.view = view('finished', { result: { winner: verdict === 'win' ? 0 : 1 } })
      expect(mocks.audio.setMusic).toHaveBeenLastCalledWith(null)
      vi.advanceTimersByTime(900)
      expect(mocks.audio.playMatchResult).toHaveBeenLastCalledWith(verdict)
      mocks.audio.stopMatchResult.mockClear()
      store.view = null
      expect(mocks.audio.stopMatchResult).toHaveBeenCalledTimes(1)
      vi.advanceTimersByTime(1000)
      expect(mocks.audio.playMatchResult).toHaveBeenCalledTimes(1)
    },
  )

  it('stops the result melody and starts preparation immediately on a new match', () => {
    store.view = view('finished', { result: { winner: 0 } })
    vi.advanceTimersByTime(900)
    mocks.audio.stopMatchResult.mockClear()
    store.view = view('planning')
    expect(mocks.audio.stopMatchResult).toHaveBeenCalledTimes(1)
    expect(mocks.audio.setMusic).toHaveBeenLastCalledWith('preparation')
  })

  it.each(['menu', 'new match'] as const)(
    'cancels a pending result melody when going to %s immediately',
    (destination) => {
      store.view = view('finished', { result: { winner: 1 } })
      vi.advanceTimersByTime(300)
      store.view = destination === 'menu' ? null : view('planning')
      vi.advanceTimersByTime(2000)
      expect(mocks.audio.playMatchResult).not.toHaveBeenCalled()
    },
  )

  it('uses the human side when announcing an online match result', () => {
    store.view = view('finished', {
      side: 1,
      result: { winner: 1 },
    })

    vi.advanceTimersByTime(900)
    expect(mocks.audio.playMatchResult).toHaveBeenLastCalledWith('win')
  })

  it('cancels pending melodies and disposes audio on app unmount', () => {
    store.view = view('finished', { result: { winner: 0 } })
    mocks.cleanup()
    vi.advanceTimersByTime(2000)
    expect(mocks.audio.playMatchResult).not.toHaveBeenCalled()
    expect(mocks.audio.dispose).toHaveBeenCalled()
  })
})
