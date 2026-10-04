import { computed, onBeforeUnmount, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { createDiscordPresence } from '@/application/discordPresence/client'
import { presenceFor } from '@/application/discordPresence/status'
import { detectDesktopApp } from '@/application/discordPresence/target'
import { useMatchStore } from '../stores/match'

/** Desktop PWA presence. A browser tab, a phone and the Discord Activity never open the socket. */
export function useDiscordPresence() {
  const match = useMatchStore()
  const { t } = useI18n()
  const client = createDiscordPresence({ enabled: detectDesktopApp() })

  const scene = computed(() => {
    const view = match.view

    return presenceFor(
      view
        ? {
            phase: view.phase,
            round: view.round,
            sandbox: view.sandbox !== null,
            duel: match.isDuel,
          }
        : null,
      {
        playing: t('presence.playing'),
        inGame: t('presence.inGame'),
        training: t('presence.training'),
        duel: t('presence.duel'),
        versus: t('presence.versus'),
        finished: t('presence.finished'),
        planning: (round) => t('presence.planning', { round }),
        battle: (round) => t('presence.battle', { round }),
        summary: (round) => t('presence.summary', { round }),
      },
    )
  })

  watch(scene, (next) => client.setPresence(next), { immediate: true })

  onMounted(() => client.connect())
  onBeforeUnmount(() => client.disconnect())

  return client
}
