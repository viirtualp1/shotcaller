<script setup lang="ts">
import {
  useDocumentVisibility,
  useElementVisibility,
  useIntervalFn,
  useMediaQuery,
  useResizeObserver,
} from '@vueuse/core'
import { Play } from '@lucide/vue'
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, ref, watchEffect } from 'vue'
import { MODE_IDS, type ModeId } from '@/content/ids'
import DemoBoard from '../components/home/DemoBoard.vue'
import LegalLinks from '../components/common/LegalLinks.vue'
import SupportButton from '../components/common/SupportButton.vue'
import CoachCard from '../components/home/CoachCard.vue'
import ContractsStrip from '../components/home/ContractsStrip.vue'
import DiscordCard from '../components/home/DiscordCard.vue'
import HomeLeaderboard from '../components/home/HomeLeaderboard.vue'
import PatchHighlight from '../components/home/PatchHighlight.vue'
import SteamCard from '../components/home/SteamCard.vue'
import GooglePlayCard from '../components/home/GooglePlayCard.vue'
import QuickStarts from '../components/home/QuickStarts.vue'
import SavedMatchCard from '../components/home/SavedMatchCard.vue'
import DuelResumeCard from '../components/hud/DuelResumeCard.vue'
import MovedCard from '../components/patchNotes/MovedCard.vue'
import LanguageSwitch from '../components/settings/LanguageSwitch.vue'
import { useGameText } from '../composables/useGameText'
import { useUiZoom } from '../composables/useUiZoom'
import { useChatStore } from '../stores/chat'
import { useCloudStore } from '../stores/cloud'
import { useDuelStore } from '../stores/duel'
import { useMatchStore } from '../stores/match'
import { useMenuStore } from '../stores/menu'
import { useReplayStore } from '../stores/replay'
import MobileHome from './MobileHome.vue'

interface DemoLayer {
  readonly id: number
  readonly mode: ModeId
}

/** The show fight moves on to the next mode this often. */
const DEMO_MODE_MS = 15_000
const DemoBattle = defineAsyncComponent(() => import('../components/board/DemoBattle.vue'))

/** Phones get their own start screen, laid out for one hand; this one is for wider screens. */
const phone = useMediaQuery('(max-width: 860px)')
/** The showcase stays wired up below. The menu is two columns until the map can sit between them again. */
const showMap = false
const menu = useMenuStore()
const match = useMatchStore()
const duel = useDuelStore()
const cloud = useCloudStore()
const chat = useChatStore()
const replay = useReplayStore()
const { t } = useGameText()
const visibility = useDocumentVisibility()
const uiZoom = useUiZoom()

const previewHost = ref<HTMLElement | null>(null)
const mounted = ref(false)
const coach = ref<HTMLElement | null>(null)
const contracts = ref<HTMLElement | null>(null)
const profileHeight = ref(0)
const contractsHeight = ref(0)

useResizeObserver(coach, () => {
  profileHeight.value = coach.value?.offsetHeight ?? 0
})

useResizeObserver(contracts, () => {
  contractsHeight.value = contracts.value?.offsetHeight ?? 0
})

const profileStyle = computed(() =>
  profileHeight.value ? { height: `${profileHeight.value}px` } : undefined,
)

const contractsStyle = computed(() =>
  contractsHeight.value ? { minHeight: `${contractsHeight.value}px` } : undefined,
)

/** The board on show, and for a moment the next mode's board fading in over it. */
const demos = ref<DemoLayer[]>([
  {
    id: 0,
    mode: MODE_IDS[0],
  },
])

const previewVisible = useElementVisibility(previewHost)
const mapPaused = ref(false)

/** The new board covers the old one now, so the old one can go. */
function demoShown(id: number) {
  demos.value = demos.value.filter((layer) => layer.id >= id)
}

useIntervalFn(() => {
  if (!previewVisible.value || visibility.value !== 'visible' || mapPaused.value) {
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

/* The friends window sits in the left column here, unless a replay covers the menu. */
watchEffect(() => {
  chat.docked = mounted.value && !phone.value && cloud.enabled && !replay.match && !replay.liveFriend
})

onMounted(() => {
  mounted.value = true
})

/* Leaving the menu must not pop the window up over the next page. */
onBeforeUnmount(() => {
  mounted.value = false
  chat.docked = false
  chat.minimize()
})
</script>

<template>
  <MobileHome v-if="phone" />

  <main v-else class="start" :style="{ '--ui-zoom': uiZoom }">
    <h1 class="sr-only">{{ t('app.title') }}</h1>

    <div class="layout" :class="{ 'with-map': showMap }">
      <div class="column side">
        <div class="scaled">
          <div ref="coach">
            <CoachCard />
          </div>

          <div class="menu">
            <DuelResumeCard />

            <div ref="contracts">
              <ContractsStrip />
            </div>
          </div>

          <div class="friends-stack" :class="{ card: cloud.enabled }">
            <div v-if="cloud.enabled" id="home-friends" class="friends" />

            <footer class="footer">
              <LanguageSwitch compact />
              <SupportButton />
              <LegalLinks />
            </footer>
          </div>
        </div>
      </div>

      <div v-if="showMap" class="column center">
        <section ref="previewHost" class="preview">
          <DemoBoard v-model:paused="mapPaused">
            <DemoBattle
              v-for="layer in previewVisible ? demos : []"
              :key="layer.id"
              :mode="layer.mode"
              :paused="mapPaused"
              @shown="demoShown(layer.id)"
            />
          </DemoBoard>
        </section>
      </div>

      <div class="column side">
        <div class="scaled">
          <MovedCard />

          <div class="tall" :style="profileStyle">
            <PatchHighlight />
          </div>

          <div class="offers" :style="contractsStyle">
            <DiscordCard />
            <SteamCard />
            <GooglePlayCard />
          </div>

          <HomeLeaderboard fill />

          <div class="launch">
            <SavedMatchCard v-if="match.saved" />

            <template v-else>
              <QuickStarts />

              <button
                type="button"
                class="play"
                :disabled="duel.matchmaking"
                @click="menu.openNewMatch('computer')"
              >
                <Play :size="22" />
                {{ t('start.home.play') }}
              </button>
            </template>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
/* The menu fills the screen inside the page's padding: profile in the top left corner, Play in the bottom right. */
.start {
  --ui-zoom: 1;
  --gap: calc(24px * var(--ui-zoom));
  --pad-y: calc(24px * var(--ui-zoom));
  --pad-x: calc(32px * var(--ui-zoom));
  --height: max(100dvh, 600px);
  display: flex;
  height: var(--height);
  padding: var(--pad-y) var(--pad-x);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

.layout {
  flex: 1;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: var(--gap);
  width: 100%;
  height: 100%;
  min-height: 0;
}

.layout.with-map {
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.35fr) minmax(0, 1fr);
}

.column {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  min-height: 0;
  animation: fade-in 0.4s 0.1s ease-out both;
}

.menu {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.menu > * {
  animation: slide-in 0.34s ease-out both;
}

.menu > :nth-child(2) {
  animation-delay: 40ms;
}

.menu > :nth-child(n + 3) {
  animation-delay: 80ms;
}

/* Scale draws the columns bigger without pushing the map or leaving a gap under them. */
.side {
  height: 100%;
  min-width: 0;
  min-height: 0;
}

.scaled {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: calc(100% / var(--ui-zoom));
  height: calc(100% / var(--ui-zoom));
  min-width: 0;
  min-height: 0;
  transform: scale(var(--ui-zoom));
  transform-origin: top left;
}

.center {
  container-type: size;
  align-items: center;
  justify-content: center;
  min-width: 0;
  min-height: 0;
}

.friends-stack {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.friends-stack.card {
  overflow: hidden;
  border: 1px solid var(--edge-strong);
  border-radius: var(--radius);
  background: var(--panel);
}

.tall {
  display: flex;
  min-height: 0;
}

.tall > :deep(.patch) {
  flex: 1;
  min-height: 0;
}

/* Discord, Steam and Google Play side by side; the row shares its width among those shown. */
.offers {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(0, 1fr);
  gap: 10px;
  min-height: 0;
}

.friends {
  flex: 1;
  display: flex;
  min-height: 0;
}

.friends :deep(.social-window) {
  flex: 1;
}

.friends-stack :deep(.social-window.docked) {
  border: 0;
  border-radius: 0;
  background: transparent;
}

.preview {
  width: min(100cqw, 100cqh);
  height: min(100cqw, 100cqh);
}

/* A saved match, or otherwise a new one, sits under the leaderboard. */
.launch {
  display: grid;
  gap: 10px;
}

.play {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 14px 22px;
  border: 0;
  border-radius: var(--radius);
  background: var(--gold);
  color: var(--ink);
  font: inherit;
  font-size: 22px;
  font-weight: 800;
  cursor: pointer;
  transition: filter 0.15s;
}

.play:hover:not(:disabled) {
  filter: brightness(1.08);
}

.play:disabled {
  opacity: 0.6;
  cursor: default;
}

/* Language, support and the legal buttons close the friends card on one line. */
.footer {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 4px;
  min-width: 0;
  margin-top: auto;
  padding: 8px 10px;
}

.footer :deep(.choices) {
  flex: none;
}

.footer :deep(.legal-links) {
  display: contents;
}

.footer :deep(.support-button),
.footer :deep(.legal-links a) {
  flex: 1 1 0;
  justify-content: center;
  gap: 4px;
  min-width: 0;
  padding: 6px 10px;
  font-size: 12px;
}

.footer :deep(.choice) {
  min-width: 40px;
  padding-inline: 12px;
  font-size: 12px;
}

.card .footer {
  border-top: 1px solid var(--edge);
}
</style>
