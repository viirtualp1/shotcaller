/// <reference lib="dom" />
import mitt from 'mitt'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AUDIO_TIMING } from '@/ui/audio/audioConfig'
import { AudioEngine } from '@/ui/audio/AudioEngine'
import type { SimulationEvents } from '@/simulation/events'

class FakeAudio {
  static instances: FakeAudio[] = []
  static rejectNextPlay = false
  loop = false
  preload = ''
  volume = 1
  playbackRate = 1
  paused = true
  onended: (() => void) | null = null
  onerror: (() => void) | null = null
  readonly play = vi.fn(() => {
    if (FakeAudio.rejectNextPlay) {
      FakeAudio.rejectNextPlay = false

      return Promise.reject(new Error('Playback blocked'))
    }

    this.paused = false

    return Promise.resolve()
  })
  readonly pause = vi.fn(() => (this.paused = true))
  readonly removeAttribute = vi.fn(() => (this.src = ''))
  readonly load = vi.fn()

  constructor(public src: string) {
    FakeAudio.instances.push(this)
  }
}

const active = () => FakeAudio.instances.filter((audio) => audio.src !== '')
const effect = (name: string) => FakeAudio.instances.findLast((audio) => audio.src.includes(name))!

const died = (team: 0 | 1): SimulationEvents['died'] => ({
  unit: {
    kind: 'hero',
    team,
  } as SimulationEvents['died']['unit'],
})

describe('game audio engine', () => {
  let engine: AudioEngine
  let gestures: EventTarget
  let page: EventTarget & { baseURI: string; visibilityState: string }

  beforeEach(() => {
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'performance'],
    })

    FakeAudio.instances = []
    FakeAudio.rejectNextPlay = false
    gestures = new EventTarget()

    page = Object.assign(new EventTarget(), {
      baseURI: 'https://shotcaller.test/',
      visibilityState: 'visible',
    })

    vi.stubGlobal('window', gestures)
    vi.stubGlobal('document', page)
    vi.stubGlobal('Audio', FakeAudio)
    engine = new AudioEngine()
    gestures.dispatchEvent(new Event('pointerdown'))
  })

  afterEach(() => {
    engine.dispose()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it.each(['preparation', 'battle', 'climax'] as const)(
    'keeps %s looping at its configured volume',
    async (track) => {
      engine.setMusicVolume(0.08)
      engine.setMusic(track)
      await vi.advanceTimersByTimeAsync(1100)
      const music = active()[0]!
      expect(music.loop).toBe(true)
      expect(music.paused).toBe(false)
      expect(music.volume).toBeCloseTo(0.08)

      await vi.advanceTimersByTimeAsync(180_000)
      gestures.dispatchEvent(new Event('pointerdown'))
      engine.setMusic(track)
      expect(active()).toEqual([music])
      expect(music.play).toHaveBeenCalledTimes(1)
      expect(music.volume).toBeCloseTo(0.08)
    },
  )

  it('does not download muted music and starts the current track when unmuted', async () => {
    engine.setMusicVolume(0)
    engine.setMusic('battle')
    engine.setMusic('climax')
    gestures.dispatchEvent(new Event('pointerdown'))
    expect(FakeAudio.instances).toHaveLength(0)
    engine.setMusicVolume(0.2)
    await vi.advanceTimersByTimeAsync(1100)
    expect(active()).toHaveLength(1)
    expect(active()[0]!.src).toContain('determined-pursuit.m4a')
    engine.setMusicVolume(0)
    expect(active()).toHaveLength(0)
  })

  it('loads audio from the site root when a patch page is open', () => {
    page.baseURI = 'https://shotcaller.test/patches/8.6.1/'
    engine.setMusic('battle')
    expect(active()[0]!.src).toBe('https://shotcaller.test/audio/music/battle-theme-a.mp3')
  })

  it('retries blocked music on a later gesture', async () => {
    FakeAudio.rejectNextPlay = true
    engine.setMusic('preparation')
    await vi.advanceTimersByTimeAsync(0)
    const failed = FakeAudio.instances[0]!
    expect(failed.load).toHaveBeenCalled()
    expect(active()).toHaveLength(0)

    gestures.dispatchEvent(new Event('keydown'))
    await vi.advanceTimersByTimeAsync(1100)
    expect(active()).toHaveLength(1)
    expect(active()[0]!.paused).toBe(false)
    expect(active()[0]!.volume).toBeGreaterThan(0)
  })

  it('resumes interrupted planning music when the page becomes visible', async () => {
    engine.setMusic('preparation')
    await vi.advanceTimersByTimeAsync(1100)
    const music = active()[0]!
    music.pause()
    page.visibilityState = 'hidden'
    page.dispatchEvent(new Event('visibilitychange'))
    expect(music.play).toHaveBeenCalledTimes(1)

    page.visibilityState = 'visible'
    page.dispatchEvent(new Event('visibilitychange'))
    await vi.advanceTimersByTimeAsync(1100)
    expect(music.play).toHaveBeenCalledTimes(2)
    expect(active()).toEqual([music])
    expect(music.volume).toBeGreaterThan(0)
  })

  it('releases music players after each fade and can return to the same track', async () => {
    engine.setMusic('preparation')
    await vi.advanceTimersByTimeAsync(1100)
    const preparation = active()[0]!
    engine.setMusic('battle')
    await vi.advanceTimersByTimeAsync(1100)
    expect(preparation.src).toBe('')
    expect(preparation.paused).toBe(true)
    expect(preparation.load).toHaveBeenCalled()
    expect(active()).toHaveLength(1)

    engine.setMusic('preparation')
    await vi.advanceTimersByTimeAsync(1100)
    expect(active()).toHaveLength(1)
    expect(active()[0]!.src).toContain('preparation-peaceful-ville.mp3')
    engine.setMusic(null)
    await vi.advanceTimersByTimeAsync(700)
    expect(active()).toHaveLength(0)
  })

  it('bounds effects during long battles and keeps music available', async () => {
    const events = mitt<SimulationEvents>()
    engine.bindSimulation(events, 0)
    engine.setMusic('battle')

    for (let i = 0; i < 100; i++) {
      events.emit('died', died(1))
      await vi.advanceTimersByTimeAsync(250)
    }

    expect(active().filter((audio) => !audio.loop)).toHaveLength(AUDIO_TIMING.maxEffectVoices)
    expect(active().filter((audio) => audio.loop)).toHaveLength(1)
    expect(FakeAudio.instances.filter((audio) => audio.src === '').length).toBeGreaterThan(80)
    engine.setMusic('preparation')
    await vi.advanceTimersByTimeAsync(1100)
    expect(active().find((audio) => audio.loop)!.paused).toBe(false)
  })

  it('releases completed and failed effects', async () => {
    engine.playMatchResult('win')
    const won = effect('fanfare')
    won.onended!()
    expect(won.src).toBe('')
    expect(won.load).toHaveBeenCalled()

    FakeAudio.rejectNextPlay = true
    engine.playMatchResult('loss')
    await vi.advanceTimersByTimeAsync(0)
    expect(active()).toHaveLength(0)
  })

  it('stops match results immediately and independently of background music', () => {
    engine.setMusic('preparation')
    engine.playMatchResult('loss')
    const lost = effect('game-over')
    engine.stopMatchResult()
    expect(lost.paused).toBe(true)
    expect(lost.src).toBe('')
    expect(active()).toHaveLength(1)
    expect(active()[0]!.loop).toBe(true)
  })

  it('detaches combat sounds and cancels delayed tower impacts before a skip', async () => {
    const events = mitt<SimulationEvents>()
    engine.bindSimulation(events, 0)

    events.emit('structureDestroyed', {
      structure: { structure: { type: 'tower' } },
      attackerTeam: 0,
    } as SimulationEvents['structureDestroyed'])

    const collapse = effect('tower-collapse')
    engine.bindSimulation(undefined, 0)
    const created = FakeAudio.instances.length
    events.emit('died', died(0))
    events.emit('died', died(1))
    await vi.advanceTimersByTimeAsync(1000)
    expect(collapse.paused).toBe(true)
    expect(FakeAudio.instances).toHaveLength(created)
    expect(active()).toHaveLength(0)
  })

  it('disposes all voices, timers and gesture listeners', async () => {
    engine.setMusic('battle')
    engine.playRoundResult('win')
    engine.playMatchResult('loss')
    engine.dispose()
    gestures.dispatchEvent(new Event('pointerdown'))
    page.dispatchEvent(new Event('visibilitychange'))
    await vi.advanceTimersByTimeAsync(2000)
    expect(active()).toHaveLength(0)
    expect(vi.getTimerCount()).toBe(0)
  })
})
