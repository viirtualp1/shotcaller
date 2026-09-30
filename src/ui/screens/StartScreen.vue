<script setup lang="ts">
import { useElementSize, useIntervalFn, useTimeoutFn } from '@vueuse/core'
import { Flag, Play, Swords } from 'lucide-vue-next'
import { computed, ref } from 'vue'
import { MODE_IDS, type ModeId } from '@/content/ids'
import BoardFrame from '../components/board/BoardFrame.vue'
import DemoBattle from '../components/board/DemoBattle.vue'
import LatestPatchCard from '../components/patchNotes/LatestPatchCard.vue'
import MovedCard from '../components/patchNotes/MovedCard.vue'
import CareerChip from '../components/profile/CareerChip.vue'
import ProfileChip from '../components/profile/ProfileChip.vue'
import SignInButton from '../components/profile/SignInButton.vue'
import FriendsButton from '../components/social/FriendsButton.vue'
import LanguageSwitch from '../components/settings/LanguageSwitch.vue'
import { useGameText } from '../composables/useGameText'
import { useDuelStore } from '../stores/duel'
import { useMatchStore } from '../stores/match'
import { useMenuStore } from '../stores/menu'
import { useSettingsStore } from '../stores/settings'

/** The show fight moves on to the next mode this often. */
const DEMO_MODE_MS = 15_000

const store = useMatchStore()
const menu = useMenuStore()
const settings = useSettingsStore()
const duel = useDuelStore()
const { t } = useGameText()
const patchCard = ref<InstanceType<typeof LatestPatchCard> | null>(null)

const patchSize = useElementSize(
  () => patchCard.value?.$el as HTMLElement | undefined,
  {
    width: 0,
    height: 96,
  },
  { box: 'border-box' },
)

interface DemoLayer {
  readonly id: number
  readonly mode: ModeId
}

/** The board on show, and for a moment the next mode's board fading in over it. */
const demos = ref<DemoLayer[]>([
  {
    id: 0,
    mode: MODE_IDS[0],
  },
])

useIntervalFn(() => {
  const current = demos.value.at(-1)!

  demos.value = [
    current,
    {
      id: current.id + 1,
      mode: MODE_IDS[(MODE_IDS.indexOf(current.mode) + 1) % MODE_IDS.length]!,
    },
  ]
}, DEMO_MODE_MS)

/** The new board covers the old one now, so the old one can go. */
function demoShown(id: number) {
  demos.value = demos.value.filter((layer) => layer.id >= id)
}

const rival = computed(() => duel.resumable?.opponent.name || t('profile.defaultName'))
/** Giving up asks once more; the question goes away on its own. */
const confirmingForfeit = ref(false)

const { start: expireForfeit } = useTimeoutFn(() => (confirmingForfeit.value = false), 3000, {
  immediate: false,
})

function forfeit() {
  if (!confirmingForfeit.value) {
    confirmingForfeit.value = true
    expireForfeit()

    return
  }

  confirmingForfeit.value = false
  void duel.forfeit()
}
</script>

<template>
  <main class="start">
    <div class="coach" :style="{ '--coach-card-height': `${patchSize.height.value || 96}px` }">
      <ProfileChip />
      <CareerChip />
      <SignInButton />
      <FriendsButton />
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
          @click="store.continueMatch()"
        >
          <Play :size="18" /> {{ t('start.continue', { round: store.savedRound }) }}
        </button>

        <button
          type="button"
          class="btn block big"
          :class="{ primary: !store.savedRound }"
          @click="menu.newMatch = true"
        >
          <Swords :size="18" /> {{ t('start.newMatch') }}
        </button>
      </nav>
    </section>

    <section class="preview">
      <BoardFrame>
        <DemoBattle
          v-for="layer in demos"
          :key="`${settings.locale}:${layer.id}`"
          :mode="layer.mode"
          @shown="demoShown(layer.id)"
        />
      </BoardFrame>
    </section>

    <div class="news">
      <MovedCard />
      <LatestPatchCard ref="patchCard" />
    </div>

    <LanguageSwitch compact class="language" />
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
  border-radius: 12px;
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
  max-width: min(320px, calc(100% - 90px));
}

.language {
  position: absolute;
  bottom: 24px;
  left: 24px;
  z-index: 1;
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
    justify-self: start;
    max-width: 100%;
  }

  .language {
    position: relative;
    inset: auto;
    justify-self: start;
  }
}
</style>
