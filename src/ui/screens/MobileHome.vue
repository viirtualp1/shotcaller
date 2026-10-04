<script setup lang="ts">
import { Play } from '@lucide/vue'
import { defineAsyncComponent } from 'vue'
import BoardFrame from '../components/board/BoardFrame.vue'
import LegalLinks from '../components/common/LegalLinks.vue'
import SupportButton from '../components/common/SupportButton.vue'
import CoachCard from '../components/home/CoachCard.vue'
import ContractsStrip from '../components/home/ContractsStrip.vue'
import DiscordCard from '../components/home/DiscordCard.vue'
import PatchHighlight from '../components/home/PatchHighlight.vue'
import QuickStarts from '../components/home/QuickStarts.vue'
import SavedMatchCard from '../components/home/SavedMatchCard.vue'
import DuelResumeCard from '../components/hud/DuelResumeCard.vue'
import MovedCard from '../components/patchNotes/MovedCard.vue'
import LanguageSwitch from '../components/settings/LanguageSwitch.vue'
import { useGameText } from '../composables/useGameText'
import { useNewcomer } from '../composables/useNewcomer'
import { useDuelStore } from '../stores/duel'
import { useMenuStore } from '../stores/menu'

/**
 * The start screen on a phone, in the order of the desktop one: the coach, the match to carry on, the week's goals
 * and what is new. Picking an opponent and Play stay above the navigation, under the thumb, however far it scrolls.
 */
const DemoBattle = defineAsyncComponent(() => import('../components/board/DemoBattle.vue'))

const menu = useMenuStore()
const duel = useDuelStore()
const newcomer = useNewcomer()
const { t } = useGameText()
</script>

<template>
  <main class="mobile-home">
    <h1 v-if="!newcomer" class="sr-only">{{ t('app.title') }}</h1>

    <CoachCard />

    <section v-if="newcomer" class="pitch">
      <h1 class="hand">{{ t('app.title') }}</h1>
      <p>{{ t('start.lede') }}</p>

      <BoardFrame>
        <DemoBattle mode="twoLanes" />
      </BoardFrame>
    </section>

    <DuelResumeCard />

    <SavedMatchCard />

    <ContractsStrip />

    <MovedCard />

    <PatchHighlight />

    <DiscordCard />

    <footer class="footer">
      <LanguageSwitch compact />
      <SupportButton />
      <LegalLinks />
    </footer>

    <div class="launch">
      <QuickStarts />

      <button type="button" class="play" :disabled="duel.matchmaking" @click="menu.openNewMatch('computer')">
        <Play :size="20" />
        {{ t('start.home.play') }}
      </button>
    </div>
  </main>
</template>

<style scoped>
.mobile-home {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: calc(100dvh - var(--mobile-tabs, 0px) - env(safe-area-inset-bottom, 0px));
  padding: calc(12px + env(safe-area-inset-top, 0px)) 16px 0;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

.pitch {
  display: grid;
  gap: 10px;
}

.pitch h1 {
  margin: 4px 0 0;
  font-size: 46px;
  line-height: 1;
}

.pitch p {
  margin: 0;
  font-size: 15px;
  line-height: 1.5;
  color: var(--chalk-dim);
}

/* Language, support and the legal links fill one row like the desktop column, then the links wrap below. */
.footer {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  margin-top: auto;
  padding-top: 8px;
}

.footer :deep(.support-button) {
  justify-content: center;
  width: 100%;
}

.footer :deep(.legal-links) {
  grid-column: 1 / -1;
}

/*
 * Sits at the end of the page and sticks to the bottom of the screen, just above the navigation, so starting a
 * match is always one tap away. The fade behind it keeps it readable over whatever scrolls underneath.
 */
.launch {
  position: sticky;
  bottom: calc(var(--mobile-tabs, 0px) + env(safe-area-inset-bottom, 0px));
  z-index: 2;
  display: grid;
  gap: 8px;
  margin: 0 -16px;
  padding: 16px 16px 12px;
  background: linear-gradient(to bottom, transparent, var(--board-deep) 22px);
}

.play {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 14px 20px;
  border: 0;
  border-radius: var(--radius);
  background: var(--gold);
  color: var(--ink);
  font: inherit;
  font-size: 20px;
  font-weight: 800;
  cursor: pointer;
}

.play:disabled {
  opacity: 0.6;
  cursor: default;
}
</style>
