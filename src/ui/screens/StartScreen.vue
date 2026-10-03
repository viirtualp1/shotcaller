<script setup lang="ts">
import {
  useDocumentVisibility,
  useElementSize,
  useElementVisibility,
  useIntervalFn,
  useTimeoutFn,
} from '@vueuse/core'
import { Flag, Play, Swords, UserPlus } from '@lucide/vue'
import { computed, defineAsyncComponent, ref } from 'vue'
import { IN_DISCORD, inviteToActivity } from '@/application/discord'
import { MODE_IDS, type ModeId } from '@/content/ids'
import BoardFrame from '../components/board/BoardFrame.vue'
import LegalLinks from '../components/common/LegalLinks.vue'
import SupportButton from '../components/common/SupportButton.vue'

import DiscordCard from '../components/patchNotes/DiscordCard.vue'
import LatestPatchCard from '../components/patchNotes/LatestPatchCard.vue'
import MovedCard from '../components/patchNotes/MovedCard.vue'
import CareerChip from '../components/profile/CareerChip.vue'
import ProfileChip from '../components/profile/ProfileChip.vue'
import SignInButton from '../components/profile/SignInButton.vue'
import LanguageSwitch from '../components/settings/LanguageSwitch.vue'
import { useGameText } from '../composables/useGameText'
import { useDuelStore } from '../stores/duel'
import { useMatchStore } from '../stores/match'
import { useMenuStore } from '../stores/menu'
import { useSettingsStore } from '../stores/settings'

interface DemoLayer {
  readonly id: number
  readonly mode: ModeId
}

/** The show fight moves on to the next mode this often. */
const DEMO_MODE_MS = 15_000
const DemoBattle = defineAsyncComponent(() => import('../components/board/DemoBattle.vue'))

const store = useMatchStore()
const menu = useMenuStore()
const settings = useSettingsStore()
const duel = useDuelStore()
const { t } = useGameText()
const visibility = useDocumentVisibility()

const previewHost = ref<HTMLElement | null>(null)
const patchCard = ref<InstanceType<typeof LatestPatchCard> | null>(null)
/** Giving up asks once more; the question goes away on its own. */
const confirmingForfeit = ref(false)

/** The board on show, and for a moment the next mode's board fading in over it. */
const demos = ref<DemoLayer[]>([
  {
    id: 0,
    mode: MODE_IDS[0],
  },
])

const previewVisible = useElementVisibility(previewHost)

const patchSize = useElementSize(
  () => patchCard.value?.$el as HTMLElement | undefined,
  {
    width: 0,
    height: 96,
  },
  { box: 'border-box' },
)

const { start: expireForfeit } = useTimeoutFn(() => (confirmingForfeit.value = false), 3000, {
  immediate: false,
})

const rival = computed(() => duel.resumable?.opponent.name || t('profile.defaultName'))

/** The new board covers the old one now, so the old one can go. */
function demoShown(id: number) {
  demos.value = demos.value.filter((layer) => layer.id >= id)
}

function forfeit() {
  if (!confirmingForfeit.value) {
    confirmingForfeit.value = true
    expireForfeit()

    return
  }

  confirmingForfeit.value = false
  void duel.forfeit()
}

/** Inside Discord, friends join this Activity through Discord's own invite. */
function inviteFriend() {
  void inviteToActivity(t('start.inviteMessage'))
}

useIntervalFn(() => {
  if (!previewVisible.value || visibility.value !== 'visible') {
    return
  }

  const current = demos.value.at(-1)!

  demos.value = [
    current,
    {
      id: current.id + 1,
      mode: MODE_IDS[(MODE_IDS.indexOf(current.mode) + 1) % MODE_IDS.length]!,
    },
  ]
}, DEMO_MODE_MS)
</script>

<template>
  <main class="start">
    <div class="coach" :style="{ '--coach-card-height': `${patchSize.height.value || 96}px` }">
      <ProfileChip />
      <CareerChip />
      <SignInButton />
    </div>

    <section class="copy">
      <h1 class="hand">{{ t('app.title') }}</h1>
      <p class="lede">{{ t('start.lede') }}</p>

      <nav class="menu">
        <section v-if="duel.resumable" class="duel">
          <strong class="duel-title"
            ><Swords :size="16" /> {{ t('duel.resumeTitle', { name: rival }) }}</strong
          >

          <p v-if="!duel.canResume" class="duel-note">{{ t('duel.elsewhere') }}</p>

          <div class="duel-actions">
            <button v-if="duel.canResume" type="button" class="btn primary" @click="duel.resume()">
              <Play :size="16" /> {{ t('duel.resume') }}
            </button>

            <button type="button" class="btn ghost" :class="{ danger: confirmingForfeit }" @click="forfeit">
              <Flag :size="16" /> {{ confirmingForfeit ? t('duel.confirmForfeit') : t('duel.forfeit') }}
            </button>
          </div>
        </section>

        <button
          v-if="store.savedRound"
          type="button"
          class="btn primary block big"
          :disabled="duel.matchmaking"
          @click="store.continueMatch()"
        >
          <Play :size="18" /> {{ t('start.continue', { round: store.savedRound }) }}
        </button>

        <button
          type="button"
          class="btn block big"
          :class="{ primary: !store.savedRound }"
          :disabled="duel.matchmaking"
          @click="menu.newMatch = true"
        >
          <Swords :size="18" /> {{ t('start.newMatch') }}
        </button>

        <button v-if="IN_DISCORD" type="button" class="btn block big" @click="inviteFriend">
          <UserPlus :size="18" /> {{ t('start.invite') }}
        </button>
      </nav>
    </section>

    <section ref="previewHost" class="preview">
      <BoardFrame>
        <DemoBattle
          v-for="layer in previewVisible ? demos : []"
          :key="`${settings.locale}:${layer.id}`"
          :mode="layer.mode"
          @shown="demoShown(layer.id)"
        />
      </BoardFrame>
    </section>

    <div class="news">
      <MovedCard />
      <DiscordCard />
      <LatestPatchCard ref="patchCard" />
    </div>

    <div class="footer">
      <LanguageSwitch compact />
      <SupportButton />
      <LegalLinks />
    </div>
  </main>
</template>

<style scoped>
.start {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr);
  align-items: center;
  gap: 40px;
  max-width: 1480px;
  min-height: 100%;
  margin: 0 auto;
  padding: calc(32px + env(safe-area-inset-top, 0px)) 24px 32px;
}

.duel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px;
  border-radius: var(--radius);
  border: 1px solid rgba(244, 197, 91, 0.5);
  background: rgba(244, 197, 91, 0.08);
}

.duel-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--gold);
  overflow-wrap: anywhere;
}

.duel-note {
  margin: 0;
  font-size: 13px;
  color: var(--chalk-dim);
}

.duel-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.btn.danger {
  border-color: rgba(255, 112, 96, 0.6);
  color: var(--theirs);
}

.copy {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 30rem;
  container-type: inline-size;
}

h1 {
  font-size: min(112px, 19cqi);
  line-height: 0.9;
  letter-spacing: -0.01em;
  white-space: nowrap;
}

.lede {
  margin: 0;
  font-size: 17px;
  color: var(--chalk-dim);
  white-space: pre-line;
}

.menu {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 14px;
  max-width: 340px;
}

.menu .btn {
  animation: slide-in 0.34s ease-out both;
}

.menu .btn:nth-child(2) {
  animation-delay: 50ms;
}

.preview {
  min-width: 0;
}

.news {
  position: absolute;
  top: calc(24px + env(safe-area-inset-top, 0px));
  right: 24px;
  z-index: 1;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  max-width: calc(100% - 688px);
}

.coach {
  position: absolute;
  top: calc(24px + env(safe-area-inset-top, 0px));
  left: 24px;
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  align-items: stretch;
  gap: 10px;
  max-width: calc(100% - 472px);
}

.coach :deep(.chip) {
  min-width: 0;
  max-width: 320px;
}

.footer {
  position: absolute;
  bottom: 24px;
  left: 24px;
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  animation: fade-in 0.4s 0.2s ease-out both;
}

@media (max-width: 1400px) {
  .news {
    display: block;
    max-width: 400px;
  }

  .news :deep(.patch-card + .patch-card) {
    margin-top: 12px;
  }
}

@media (max-width: 860px) {
  .start {
    grid-template-columns: minmax(0, 1fr);
    padding: calc(24px + env(safe-area-inset-top, 0px)) 16px 24px;
    gap: 24px;
  }

  .copy,
  .menu {
    max-width: none;
  }

  .news {
    position: relative;
    inset: auto;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    width: auto;
    max-width: none;
  }

  .news :deep(.patch-card) {
    width: 100%;
    max-width: none;
    margin: 0;
  }

  .coach {
    position: relative;
    inset: auto;
    display: grid;
    grid-template-columns: minmax(0, 2.5fr) minmax(0, 1fr);
    width: 100%;
    max-width: 100%;
    gap: 8px;
  }

  .coach:has(> .sign-in) {
    grid-template-columns: minmax(0, 2.5fr) repeat(2, minmax(0, 1fr));
  }

  .coach :deep(.chip) {
    width: 100%;
    max-width: none;
    gap: 8px;
    padding-inline: 12px;
  }

  .coach :deep(.chip .who) {
    flex: 1;
    margin-right: 8px;
  }

  .coach :deep(.chip .rank) {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .coach :deep(.career-chip),
  .coach :deep(.sign-in) {
    width: 100%;
    min-width: 0;
    padding-inline: 0;
  }

  .footer {
    position: relative;
    inset: auto;
    justify-self: start;
  }
}
</style>
