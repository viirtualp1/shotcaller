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
  gain: number
  fadeTimer: ReturnType<typeof setInterval> | null
}

const randomItem = <T>(items: readonly T[]) => items[Math.floor(Math.random() * items.length)]!

export class AudioEngine {
  private musicVolume = 0.38
  private effectsVolume = 0.72
  private desiredTrack: MusicTrack = null
  private unlocked = false
  private currentMusic: MusicVoice | null = null
  private readonly musicVoices = new Set<MusicVoice>()
  private readonly lastEffectAt = new Map<string, number>()
  private detachSimulation: (() => void) | null = null
  private readonly unlock = () => {
    this.unlocked = true
    this.startDesiredMusic()
  }

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('pointerdown', this.unlock)
      window.addEventListener('keydown', this.unlock)
    }
  }

  setMusicVolume(volume: number) {
    this.musicVolume = this.clamp(volume)

    for (const voice of this.musicVoices) {
      this.updateVoiceVolume(voice)
    }
  }

  setEffectsVolume(volume: number) {
    this.effectsVolume = this.clamp(volume)
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

    if (!events) {
      return
    }

    const onStructureDestroyed = ({ structure }: SimulationEvents['structureDestroyed']) => {
      const type = structure.structure?.type
      if (type !== 'tower' && type !== 'throne') {
        return
      }

      if (this.playEffect('towerCollapse')) {
        window.setTimeout(() => {
          this.playEffect('towerMiningImpact')
          this.playEffect('towerPlateImpact')
        }, AUDIO_TIMING.towerImpactDelayMs)
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
    this.playEffect(result === 'draw' ? 'roundDrawn' : 'roundWon')
  }

  playMatchResult(result: 'win' | 'loss') {
    this.playEffect(result === 'win' ? 'matchWon' : 'matchLost')
  }

  dispose() {
    this.detachSimulation?.()
    this.detachSimulation = null

    if (typeof window !== 'undefined') {
      window.removeEventListener('pointerdown', this.unlock)
      window.removeEventListener('keydown', this.unlock)
    }

    for (const voice of this.musicVoices) {
      this.stopVoice(voice)
    }
  }

  private startDesiredMusic() {
    const track = this.desiredTrack ? MUSIC_TRACKS[this.desiredTrack] : null
    if (this.currentMusic?.audio.src.endsWith(track?.url ?? '\u0000')) {
      return
    }

    for (const voice of [...this.musicVoices]) {
      this.fade(voice, 0, AUDIO_TIMING.musicFadeOutMs)
    }

    this.currentMusic = null

    if (!track || typeof Audio === 'undefined' || typeof document === 'undefined') {
      return
    }

    const audio = new Audio(new URL(track.url, document.baseURI).toString())
    audio.loop = true
    audio.preload = 'none'

    const voice: MusicVoice = {
      audio,
      gain: 0,
      fadeTimer: null,
    }

    this.musicVoices.add(voice)
    this.currentMusic = voice
    /* HTMLAudioElement starts at volume 1; apply the silent fade-in position before playback. */
    this.updateVoiceVolume(voice)

    void audio
      .play()
      .then(() => {
        if (this.currentMusic === voice) {
          this.fade(voice, track.volume, track.fadeInMs)
        }
      })
      .catch(() => {
        /* A later user gesture retries playback if the browser delayed its audio permission. */
      })
  }

  private playEffect(effect: SoundEffect) {
    const clip: AudioClip = SOUND_EFFECTS[effect]
    if (clip.cooldownMs && !this.allowEffect(effect, clip.cooldownMs)) {
      return false
    }

    this.play(randomItem(clip.urls), clip.volume, clip.pitchSemitones)

    return true
  }

  private play(path: string, gain: number, detune = 0) {
    if (
      !this.unlocked ||
      this.effectsVolume <= 0 ||
      typeof Audio === 'undefined' ||
      typeof document === 'undefined'
    ) {
      return
    }

    const audio = new Audio(new URL(path, document.baseURI).toString())
    audio.preload = 'auto'
    audio.volume = this.clamp(this.effectsVolume * gain)

    if (detune !== 0) {
      audio.playbackRate = 2 ** (detune / 12)
    }

    void audio.play().catch(() => undefined)
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

    voice.audio.pause()
    this.musicVoices.delete(voice)
  }

  private clamp(value: number) {
    return Math.max(0, Math.min(1, value))
  }
}
