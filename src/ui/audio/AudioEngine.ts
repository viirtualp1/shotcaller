import type { SimulationEmitter, SimulationEvents } from '@/simulation/events'
import type { TeamId } from '@/content/ids'
import {
  AUDIO_TIMING,
  MUSIC_TRACKS,
  SOUND_EFFECTS,
  type AudioClip,
  type MusicTrackId,
  type SoundEffect,
} from './audioConfig'

export type MusicTrack = MusicTrackId | null
export type RoundResult = 'win' | 'loss' | 'draw'

interface MusicVoice {
  readonly audio: HTMLAudioElement
  readonly track: MusicTrackId
  gain: number
  starting: boolean
  fadeTimer: ReturnType<typeof setInterval> | null
}

type EffectGroup = 'combat' | 'round' | 'match'

interface EffectVoice {
  readonly audio: HTMLAudioElement
  readonly group: EffectGroup
  readonly gain: number
}

const randomItem = <T>(items: readonly T[]) => items[Math.floor(Math.random() * items.length)]!

export class AudioEngine {
  private musicVolume = 0.38
  private effectsVolume = 0.72
  private desiredTrack: MusicTrack = null
  private unlocked = false
  private currentMusic: MusicVoice | null = null
  private readonly musicVoices = new Set<MusicVoice>()
  private readonly effectVoices = new Set<EffectVoice>()
  private readonly delayedEffects = new Set<ReturnType<typeof setTimeout>>()
  private readonly lastEffectAt = new Map<string, number>()
  private detachSimulation: (() => void) | null = null
  private readonly unlock = () => {
    this.unlocked = true
    this.startDesiredMusic()
  }
  private readonly restoreMusic = () => {
    if (document.visibilityState === 'visible' && this.unlocked) {
      this.startDesiredMusic()
    }
  }

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('pointerdown', this.unlock)
      window.addEventListener('keydown', this.unlock)
      window.addEventListener('pageshow', this.restoreMusic)
      document.addEventListener('visibilitychange', this.restoreMusic)
    }
  }

  setMusicVolume(volume: number) {
    this.musicVolume = this.clamp(volume)

    for (const voice of this.musicVoices) {
      this.updateVoiceVolume(voice)
    }

    if (this.musicVolume === 0) {
      for (const voice of [...this.musicVoices]) {
        this.stopVoice(voice)
      }
    } else if (this.unlocked) {
      this.startDesiredMusic()
    }
  }

  setEffectsVolume(volume: number) {
    this.effectsVolume = this.clamp(volume)

    for (const voice of this.effectVoices) {
      voice.audio.volume = this.clamp(this.effectsVolume * voice.gain)
    }
  }

  setMusic(track: MusicTrack) {
    if (this.desiredTrack === track) {
      return
    }

    this.desiredTrack = track

    if (this.unlocked) {
      this.startDesiredMusic()
    }
  }

  bindSimulation(events: SimulationEmitter | undefined, humanSide: TeamId) {
    this.detachSimulation?.()
    this.detachSimulation = null
    this.lastEffectAt.clear()
    this.stopEffects('combat')

    for (const timer of this.delayedEffects) {
      clearTimeout(timer)
    }

    this.delayedEffects.clear()

    if (!events) {
      return
    }

    const onStructureDestroyed = ({ structure }: SimulationEvents['structureDestroyed']) => {
      const type = structure.structure?.type
      if (type !== 'tower' && type !== 'throne') {
        return
      }

      if (this.playEffect('towerCollapse')) {
        const timer = setTimeout(() => {
          this.delayedEffects.delete(timer)
          this.playEffect('towerMiningImpact')
          this.playEffect('towerPlateImpact')
        }, AUDIO_TIMING.towerImpactDelayMs)

        this.delayedEffects.add(timer)
      }
    }

    const onDied = ({ unit }: SimulationEvents['died']) => {
      if (unit.kind !== 'hero') {
        return
      }

      if (unit.team === humanSide) {
        this.playEffect('allyHeroDeath')
      } else {
        this.playEffect('enemyHeroDeath')
      }
    }

    const onHealed = ({ amount }: SimulationEvents['healed']) => {
      if (amount >= AUDIO_TIMING.minimumHealAmount) {
        this.playEffect('heal')
      }
    }

    events.on('structureDestroyed', onStructureDestroyed)
    events.on('died', onDied)
    events.on('healed', onHealed)

    this.detachSimulation = () => {
      events.off('structureDestroyed', onStructureDestroyed)
      events.off('died', onDied)
      events.off('healed', onHealed)
    }
  }

  playRoundResult(result: RoundResult) {
    this.stopRoundResult()
    this.playEffect(result === 'draw' ? 'roundDrawn' : 'roundWon', 'round')
  }

  playMatchResult(result: 'win' | 'loss') {
    this.stopRoundResult()
    this.stopMatchResult()
    this.playEffect(result === 'win' ? 'matchWon' : 'matchLost', 'match')
  }

  stopRoundResult() {
    this.stopEffects('round')
  }

  stopMatchResult() {
    this.stopEffects('match')
  }

  dispose() {
    this.bindSimulation(undefined, 0)
    this.desiredTrack = null
    this.unlocked = false

    if (typeof window !== 'undefined') {
      window.removeEventListener('pointerdown', this.unlock)
      window.removeEventListener('keydown', this.unlock)
      window.removeEventListener('pageshow', this.restoreMusic)
      document.removeEventListener('visibilitychange', this.restoreMusic)
    }

    for (const voice of this.musicVoices) {
      this.stopVoice(voice)
    }

    this.stopRoundResult()
    this.stopMatchResult()
  }

  private startDesiredMusic() {
    if (this.musicVolume <= 0 || document.visibilityState === 'hidden') {
      return
    }

    const trackId = this.desiredTrack
    const track = trackId ? MUSIC_TRACKS[trackId] : null
    if (this.currentMusic && this.currentMusic.track === trackId) {
      this.playMusic(this.currentMusic)

      return
    }

    for (const voice of [...this.musicVoices]) {
      this.fade(voice, 0, AUDIO_TIMING.musicFadeOutMs)
    }

    this.currentMusic = null

    if (!trackId || !track || typeof Audio === 'undefined' || typeof document === 'undefined') {
      return
    }

    const audio = new Audio(
      new URL(track.url, new URL(import.meta.env.BASE_URL, document.baseURI)).toString(),
    )

    audio.loop = true
    audio.preload = 'auto'

    const voice: MusicVoice = {
      audio,
      track: trackId,
      gain: 0,
      starting: false,
      fadeTimer: null,
    }

    this.musicVoices.add(voice)
    this.currentMusic = voice
    /* HTMLAudioElement starts at volume 1; apply the silent fade-in position before playback. */
    this.updateVoiceVolume(voice)
    audio.onerror = () => this.stopVoice(voice)
    this.playMusic(voice)
  }

  private playMusic(voice: MusicVoice) {
    if (voice.starting || !voice.audio.paused) {
      return
    }

    voice.starting = true

    void voice.audio
      .play()
      .then(() => {
        voice.starting = false

        if (this.currentMusic === voice) {
          const track = MUSIC_TRACKS[voice.track]
          this.fade(voice, track.volume, track.fadeInMs)
        }
      })
      .catch(() => {
        /* A later user gesture retries playback if the browser delayed its audio permission. */
        voice.starting = false
        this.stopVoice(voice)
      })
  }

  private playEffect(effect: SoundEffect, group: EffectGroup = 'combat') {
    const clip: AudioClip = SOUND_EFFECTS[effect]
    if (clip.cooldownMs && !this.allowEffect(effect, clip.cooldownMs)) {
      return false
    }

    return this.play(randomItem(clip.urls), clip.volume, group, clip.pitchSemitones)
  }

  private play(path: string, gain: number, group: EffectGroup, detune = 0) {
    if (
      !this.unlocked ||
      this.effectsVolume <= 0 ||
      typeof Audio === 'undefined' ||
      typeof document === 'undefined'
    ) {
      return false
    }

    // A long battle must not exhaust the browser's media players.
    if (this.effectVoices.size >= AUDIO_TIMING.maxEffectVoices) {
      const oldestCombat = [...this.effectVoices].find((voice) => voice.group === 'combat')
      if (oldestCombat) {
        this.stopEffect(oldestCombat)
      } else {
        return false
      }
    }

    const audio = new Audio(new URL(path, new URL(import.meta.env.BASE_URL, document.baseURI)).toString())
    audio.preload = 'auto'
    audio.volume = this.clamp(this.effectsVolume * gain)

    if (detune !== 0) {
      audio.playbackRate = 2 ** (detune / 12)
    }

    const voice: EffectVoice = {
      audio,
      group,
      gain,
    }

    this.effectVoices.add(voice)
    audio.onended = () => this.stopEffect(voice)
    audio.onerror = () => this.stopEffect(voice)
    void audio.play().catch(() => this.stopEffect(voice))

    return true
  }

  private stopEffects(group: EffectGroup) {
    for (const voice of this.effectVoices) {
      if (voice.group === group) {
        this.stopEffect(voice)
      }
    }
  }

  private stopEffect(voice: EffectVoice) {
    this.effectVoices.delete(voice)
    this.releaseAudio(voice.audio)
  }

  private allowEffect(name: string, cooldown: number) {
    const now = performance.now()
    const previous = this.lastEffectAt.get(name) ?? -Infinity
    if (now - previous < cooldown) {
      return false
    }

    this.lastEffectAt.set(name, now)

    return true
  }

  private fade(voice: MusicVoice, target: number, duration: number) {
    if (voice.fadeTimer) {
      clearInterval(voice.fadeTimer)
    }

    const initial = voice.gain
    const startedAt = performance.now()
    voice.fadeTimer = setInterval(() => {
      const progress = Math.min(1, (performance.now() - startedAt) / duration)
      voice.gain = initial + (target - initial) * progress
      this.updateVoiceVolume(voice)

      if (progress === 1) {
        if (voice.fadeTimer) {
          clearInterval(voice.fadeTimer)
          voice.fadeTimer = null
        }

        if (target === 0) {
          this.stopVoice(voice)
        }
      }
    }, 30)
  }

  private updateVoiceVolume(voice: MusicVoice) {
    voice.audio.volume = this.clamp(this.musicVolume * voice.gain)
  }

  private stopVoice(voice: MusicVoice) {
    if (voice.fadeTimer) {
      clearInterval(voice.fadeTimer)
      voice.fadeTimer = null
    }

    this.musicVoices.delete(voice)

    if (this.currentMusic === voice) {
      this.currentMusic = null
    }

    this.releaseAudio(voice.audio)
  }

  private releaseAudio(audio: HTMLAudioElement) {
    audio.onended = null
    audio.onerror = null
    audio.pause()
    audio.removeAttribute('src')
    audio.load()
  }

  private clamp(value: number) {
    return Math.max(0, Math.min(1, value))
  }
}
