import { computed, onBeforeUnmount, watch } from 'vue'
import type { MusicTrack } from '../audio/AudioEngine'
import { useAudioStore } from '../stores/audio'
import { useMatchStore } from '../stores/match'
import { usePatchNotesStore } from '../stores/patchNotes'
import { useProfileStore } from '../stores/profile'
import { useReplayStore } from '../stores/replay'

/** Audio follows the visible match, including synchronous skips and leaving its report. */
export function useGameAudio() {
  const store = useMatchStore()
  const patchNotes = usePatchNotesStore()
  const profile = useProfileStore()
  const replay = useReplayStore()
  const audio = useAudioStore()

  const track = computed<MusicTrack>(() => {
    if (replay.match) {
      return 'battle'
    }

    if (patchNotes.patch || profile.isOpen || !store.view || store.phase === 'finished') {
      return null
    }

    if (store.phase !== 'battle') {
      return 'preparation'
    }

    const throneUnderThirtyPercent = store.simulation?.queries.structures.entities.some(
      (structure) =>
        structure.structure?.type === 'throne' && structure.health.current / structure.health.max <= 0.3,
    )

    const battleNearEnd = (store.live?.duration ?? Infinity) - (store.live?.elapsed ?? 0) <= 18

    return throneUnderThirtyPercent || battleNearEnd ? 'climax' : 'battle'
  })

  watch(track, (next) => audio.setMusic(next), {
    immediate: true,
    flush: 'sync',
  })

  watch(
    () => [store.simulation, store.view?.side, store.phase, store.battleSkipped] as const,
    ([simulation, side, phase, skipped]) =>
      audio.bindSimulation(phase === 'battle' && !skipped ? simulation?.events : undefined, side ?? 0),
    {
      immediate: true,
      flush: 'sync',
    },
  )

  watch(
    () => store.view?.history.length ?? 0,
    (count, previous) => {
      if (count > previous && !store.battleSkipped) {
        audio.playRoundResult(store.view?.history.at(-1) ?? 'draw')
      }
    },
    { flush: 'sync' },
  )

  watch(
    () => store.phase,
    (phase) => {
      if (phase === null || phase === 'planning') {
        audio.stopRoundResult()
      }
    },
    { flush: 'sync' },
  )

  let matchResultTimer: ReturnType<typeof setTimeout> | undefined

  watch(
    () => (store.phase === 'finished' ? store.view?.result : null),
    (result) => {
      if (matchResultTimer !== undefined) {
        clearTimeout(matchResultTimer)
        matchResultTimer = undefined
      }

      audio.stopMatchResult()

      if (result?.winner === null || result?.winner === undefined) {
        return
      }

      const verdict = result.winner === store.view?.side ? 'win' : 'loss'
      matchResultTimer = setTimeout(() => {
        matchResultTimer = undefined
        audio.playMatchResult(verdict)
      }, 900)
    },
    { flush: 'sync' },
  )

  onBeforeUnmount(() => {
    if (matchResultTimer !== undefined) {
      clearTimeout(matchResultTimer)
    }

    audio.dispose()
  })
}
