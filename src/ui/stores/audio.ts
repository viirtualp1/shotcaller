import { useLocalStorage } from '@vueuse/core'
import { defineStore } from 'pinia'
import { watch } from 'vue'
import { STORAGE_KEYS } from '@/application/persistence/storageKeys'
import type { TeamId } from '@/content/ids'
import type { SimulationEmitter } from '@/simulation/events'
import { AudioEngine, type MusicTrack, type RoundResult } from '../audio/AudioEngine'

const engine = new AudioEngine()

/** Saved volume controls and the game audio bridge. */
export const useAudioStore = defineStore('audio', () => {
  const musicVolume = useLocalStorage(STORAGE_KEYS.musicVolume, 0.08)
  const effectsVolume = useLocalStorage(STORAGE_KEYS.effectsVolume, 0.12)
  const volumeVersion = useLocalStorage(STORAGE_KEYS.audioVolumeVersion, 0)

  if (volumeVersion.value < 1) {
    musicVolume.value = 0.08
    effectsVolume.value = 0.12
    volumeVersion.value = 1
  }

  watch(
    musicVolume,
    (value) => {
      const limited = Math.max(0, Math.min(0.3, Number(value)))
      if (limited !== value) {
        musicVolume.value = limited
      }

      engine.setMusicVolume(limited)
    },
    { immediate: true },
  )

  watch(
    effectsVolume,
    (value) => {
      const limited = Math.max(0, Math.min(0.3, Number(value)))
      if (limited !== value) {
        effectsVolume.value = limited
      }

      engine.setEffectsVolume(limited)
    },
    { immediate: true },
  )

  return {
    musicVolume,
    effectsVolume,
    setMusic: (track: MusicTrack) => engine.setMusic(track),
    setMusicPaused: (paused: boolean) => engine.setMusicPaused(paused),
    bindSimulation: (events: SimulationEmitter | undefined, humanSide: TeamId) =>
      engine.bindSimulation(events, humanSide),
    playRoundResult: (result: RoundResult) => engine.playRoundResult(result),
    playMatchResult: (result: 'win' | 'loss') => engine.playMatchResult(result),
    stopRoundResult: () => engine.stopRoundResult(),
    stopMatchResult: () => engine.stopMatchResult(),
    dispose: () => engine.dispose(),
  }
})
