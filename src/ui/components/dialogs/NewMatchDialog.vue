<script setup lang="ts">
import { Play, Swords } from '@lucide/vue'
import {
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  ToggleGroupItem,
  ToggleGroupRoot,
} from 'reka-ui'
import { computed, ref, watch } from 'vue'
import { TUTORIAL_MODE } from '@/content/modes'
import { rankFor } from '@/domain/profile/progression'
import { useGameText } from '../../composables/useGameText'
import { useModal } from '../../composables/useModal'
import { useMatchStore } from '../../stores/match'
import { useMenuStore } from '../../stores/menu'
import { useSettingsStore } from '../../stores/settings'
import { useTutorial } from '../../tutorial/useTutorial'
import { useCloudStore } from '../../stores/cloud'
import { useDuelStore } from '../../stores/duel'
import { useProfileStore } from '../../stores/profile'
import CheckField from '../common/CheckField.vue'
import ModePicker from '../modes/ModePicker.vue'
import SettingsFields from '../settings/SettingsFields.vue'
import RankMedal from '../profile/RankMedal.vue'

const menu = useMenuStore()
const store = useMatchStore()
const settings = useSettingsStore()
const tour = useTutorial()
const cloud = useCloudStore()
const duel = useDuelStore()
const profile = useProfileStore()
const { t } = useGameText()
useModal(() => menu.newMatch)

const opponent = ref<'computer' | 'online'>('computer')

const opponentChoice = computed({
  get: () => opponent.value,
  set: (value: string | undefined) => {
    if (value === 'computer' || value === 'online') {
      opponent.value = value
    }
  },
})

const rating = computed(() => profile.profile.ratings[settings.mode])
const rank = computed(() => rankFor(rating.value))

/** Offered until the tutorial is done, and only on its mode: another mode picked means the coach knows the way. */
const withTutorial = computed({
  get: () => settings.tutorialWanted && settings.mode === TUTORIAL_MODE,
  set: (value: boolean) => {
    settings.tutorialWanted = value

    if (value) {
      settings.mode = TUTORIAL_MODE
    }
  },
})

function start() {
  if (duel.matchmaking) {
    return
  }

  if (opponent.value === 'online') {
    void duel.search(settings.mode)

    if (duel.matchmaking) {
      menu.newMatch = false
      menu.gameMenu = false

      if (store.view && !store.isDuel) {
        store.leaveToMenu()
      }
    }

    return
  }

  menu.newMatch = false
  menu.gameMenu = false
  store.newMatch(settings.mode)

  if (withTutorial.value) {
    menu.requestTutorial()
  }
}

function signIn() {
  menu.newMatch = false
  cloud.signInOpen = true
}

watch(
  () => menu.newMatch,
  (open) => {
    if (open) {
      settings.tutorialWanted = !tour.completed.value
    }
  },
)

watch(
  () => store.isDuel,
  (active) => {
    if (active) {
      menu.newMatch = false
    }
  },
)
</script>

<template>
  <DialogRoot v-model:open="menu.newMatch">
    <DialogPortal>
      <DialogOverlay class="overlay" />

      <DialogContent class="sheet new-match" :aria-describedby="undefined">
        <DialogTitle class="title hand">{{ t('newMatch.title') }}</DialogTitle>

        <ToggleGroupRoot
          v-model="opponentChoice"
          type="single"
          class="segmented-control"
          :aria-label="t('matchmaking.opponent')"
          :disabled="duel.busy || duel.cancellingSearch"
        >
          <ToggleGroupItem value="computer" class="segmented-option">
            {{ t('matchmaking.computer') }}
          </ToggleGroupItem>

          <ToggleGroupItem value="online" class="segmented-option">
            {{ t('matchmaking.online') }}
          </ToggleGroupItem>
        </ToggleGroupRoot>

        <div class="mode">
          <ModePicker v-model="settings.mode" :disabled="duel.cancellingSearch" />
          <p v-if="withTutorial && opponent === 'computer'" class="note">{{ t('modes.tutorialNote') }}</p>
        </div>

        <SettingsFields v-if="opponent === 'computer'" :language="false" :sound="false" :telemetry="false">
          <template #beforeExperiments>
            <CheckField v-model="withTutorial">{{ t('newMatch.tutorial') }}</CheckField>
          </template>
        </SettingsFields>

        <section v-else class="ranked">
          <div class="ranked-summary">
            <RankMedal :tier="rank.tier" :stars="rank.stars" :size="44" />

            <div class="ranked-mode">
              <strong>{{ t('matchmaking.rankedMode', { mode: t(`modes.${settings.mode}.name`) }) }}</strong>
              <span>{{ t(`profile.ranks.${rank.tier}`) }} · {{ rating }} MMR</span>
            </div>
          </div>

          <p class="note">{{ t('matchmaking.hint') }}</p>
        </section>

        <div class="actions">
          <button
            v-if="opponent === 'online' && !cloud.signedIn"
            type="button"
            class="btn primary block big"
            @click="signIn"
          >
            {{ t('matchmaking.signIn') }}
          </button>

          <button
            v-else
            type="button"
            class="btn primary block big"
            :disabled="
              duel.matchmaking ||
              (opponent === 'online' && (!duel.connected || duel.busy || duel.resumable !== null))
            "
            @click="start"
          >
            <Swords v-if="opponent === 'online'" :size="18" />
            <Play v-else :size="18" /> {{ t(opponent === 'online' ? 'matchmaking.find' : 'newMatch.start') }}
          </button>

          <button
            type="button"
            class="btn ghost block"
            :disabled="duel.cancellingSearch"
            @click="menu.newMatch = false"
          >
            {{ t('newMatch.cancel') }}
          </button>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style scoped>
.new-match {
  width: min(420px, calc(100vw - 32px));
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-height: calc(100dvh - 32px);
  overflow-y: auto;
}

.title {
  font-size: 40px;
  line-height: 1;
}

.mode {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.note {
  margin: 0;
  font-size: 12px;
  color: var(--chalk-faint);
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ranked {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  border: 1px solid var(--edge);
  border-radius: var(--radius);
  background: rgba(244, 197, 91, 0.04);
}

.ranked-summary {
  display: flex;
  align-items: center;
  gap: 16px;
}

.ranked-mode {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 14px;
}

.ranked-mode span {
  color: var(--chalk-dim);
  font-size: 12px;
}
</style>
