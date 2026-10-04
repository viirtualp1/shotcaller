<script setup lang="ts">
import { useDocumentVisibility, useElementVisibility, useIntervalFn, useMediaQuery } from '@vueuse/core'
import { Play, UserPlus } from '@lucide/vue'
import { computed, defineAsyncComponent, ref } from 'vue'
import { IN_DISCORD, inviteToActivity } from '@/application/discord'
import { MODE_IDS, type ModeId } from '@/content/ids'
import BoardFrame from '../components/board/BoardFrame.vue'
import LegalLinks from '../components/common/LegalLinks.vue'
import SupportButton from '../components/common/SupportButton.vue'
import ContractsStrip from '../components/home/ContractsStrip.vue'
import NewsChips from '../components/home/NewsChips.vue'
import QuickStarts from '../components/home/QuickStarts.vue'
import SavedMatchCard from '../components/home/SavedMatchCard.vue'
import DuelResumeCard from '../components/hud/DuelResumeCard.vue'
import MovedCard from '../components/patchNotes/MovedCard.vue'
import ProfileChip from '../components/profile/ProfileChip.vue'
import SignInButton from '../components/profile/SignInButton.vue'
import LanguageSwitch from '../components/settings/LanguageSwitch.vue'
import FriendsCard from '../components/social/FriendsCard.vue'
import { useGameText } from '../composables/useGameText'
import { useNewcomer } from '../composables/useNewcomer'
import { useCloudStore } from '../stores/cloud'
import { useDuelStore } from '../stores/duel'
import { useMatchStore } from '../stores/match'
import { useMenuStore } from '../stores/menu'
import { useSettingsStore } from '../stores/settings'
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
const store = useMatchStore()
const menu = useMenuStore()
const settings = useSettingsStore()
const duel = useDuelStore()
const cloud = useCloudStore()
const newcomer = useNewcomer()
const { t } = useGameText()
const visibility = useDocumentVisibility()

const previewHost = ref<HTMLElement | null>(null)

/** The board on show, and for a moment the next mode's board fading in over it. */
const demos = ref<DemoLayer[]>([
  {
    id: 0,
    mode: MODE_IDS[0],
  },
])

/** A returning coach with an account sees their friends beside the menu; the show fight is for everyone else. */
const social = computed(() => cloud.enabled && cloud.signedIn && !newcomer.value)
const previewVisible = useElementVisibility(previewHost)

/** The new board covers the old one now, so the old one can go. */
function demoShown(id: number) {
  demos.value = demos.value.filter((layer) => layer.id >= id)
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
  <MobileHome v-if="phone" />

  <main v-else class="start" :class="{ social }">
    <header class="top">
      <div class="coach">
        <ProfileChip />
        <SignInButton />
      </div>

      <div class="news">
        <MovedCard />
        <NewsChips titled />
      </div>
    </header>

    <section class="copy">
      <h1 class="hand" :class="{ compact: !newcomer }">{{ t('app.title') }}</h1>
      <p v-if="newcomer" class="lede">{{ t('start.lede') }}</p>

      <div class="home-columns">
        <div class="menu">
          <DuelResumeCard />
          <SavedMatchCard />

          <button
            v-if="!store.saved && !duel.resumable"
            type="button"
            class="btn primary block big"
            :disabled="duel.matchmaking"
            @click="menu.openNewMatch('computer')"
          >
            <Play :size="18" /> {{ t('start.home.play') }}
          </button>

          <QuickStarts />

          <button v-if="IN_DISCORD" type="button" class="btn block" @click="inviteFriend">
            <UserPlus :size="17" /> {{ t('start.invite') }}
          </button>

          <ContractsStrip />
        </div>

        <section v-if="social" class="friends">
          <FriendsCard fill />
        </section>
      </div>
    </section>

    <section v-if="!social" ref="previewHost" class="preview">
      <BoardFrame>
        <DemoBattle
          v-for="layer in previewVisible ? demos : []"
          :key="`${settings.locale}:${layer.id}`"
          :mode="layer.mode"
          @shown="demoShown(layer.id)"
        />
      </BoardFrame>
    </section>

    <footer class="footer">
      <LanguageSwitch compact />
      <SupportButton />
      <LegalLinks />
    </footer>
  </main>
</template>

<style scoped>
.start {
  --coach-card-height: 52px;
  display: grid;
  grid-template-columns: minmax(0, 440px) minmax(0, 1fr);
  grid-template-rows: auto 1fr auto;
  align-items: center;
  column-gap: clamp(32px, 6vw, 96px);
  row-gap: 24px;
  max-width: 1480px;
  min-height: 100%;
  margin: 0 auto;
  padding: calc(24px + env(safe-area-inset-top, 0px)) 24px 24px;
}

/* Beside a friends list the two columns sit together in the middle instead of spreading to the edges. */
.start.social {
  grid-template-columns: minmax(0, 932px);
  justify-content: center;
  column-gap: 0;
}

.start.social .copy {
  max-width: none;
  width: 100%;
}

.home-columns {
  display: flex;
  flex-direction: column;
}

.start.social .home-columns {
  min-height: 300px;
  display: grid;
  grid-template-columns: minmax(0, 440px) minmax(0, 420px);
  column-gap: clamp(24px, 5vw, 72px);
  align-items: stretch;
}

.start.social .menu {
  margin-top: 0;
}

/* One row across the top: who you are on the left, what is new on the right. */
.top,
.footer {
  display: flex;
  grid-column: 1 / -1;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.top {
  justify-content: space-between;
  align-self: start;
}

/* The header and footer keep to the screen's edges even when the columns gather in the middle. */
.start.social .top,
.start.social .footer {
  width: calc(min(100vw, 1480px) - 48px);
  justify-self: center;
}

.coach,
.news {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  animation: fade-in 0.4s 0.1s ease-out both;
}

.coach :deep(.chip) {
  min-width: 0;
  max-width: 320px;
  padding-block: 6px;
  box-shadow: none;
}

.coach :deep(.sign-in) {
  box-shadow: none;
}

.news {
  justify-content: flex-end;
}

.copy {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 440px;
  container-type: inline-size;
}

h1 {
  margin-bottom: 16px;
  font-size: min(112px, 19cqi);
  line-height: 0.9;
  letter-spacing: -0.01em;
  white-space: nowrap;
}

/* A returning coach knows the name; the title steps back so the match comes first. */
h1.compact {
  font-size: min(72px, 15cqi);
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
}

.menu > * {
  animation: slide-in 0.34s ease-out both;
}

.menu > :nth-child(2) {
  animation-delay: 40ms;
}

.menu > :nth-child(3) {
  animation-delay: 80ms;
}

.menu > :nth-child(n + 4) {
  animation-delay: 120ms;
}

.preview,
.friends {
  min-width: 0;
}

/* The board is square: it never grows taller than the space between the header and the footer. */
.preview {
  justify-self: center;
  width: min(100%, max(420px, 100dvh - 200px));
}

.friends {
  position: relative;
  animation: fade-in 0.4s 0.15s ease-out both;
}

.friends :deep(.panel) {
  position: absolute;
  inset: 0;
}

.footer {
  animation: fade-in 0.4s 0.2s ease-out both;
}
</style>
