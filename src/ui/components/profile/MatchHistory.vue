<script setup lang="ts">
import { ChevronRight, Crown, Swords } from 'lucide-vue-next'
import { ref } from 'vue'
import { isRated, type MatchRecord } from '@/domain/profile/Profile'
import { useGameText } from '../../composables/useGameText'
import { useProfileStore } from '../../stores/profile'
import { useSettingsStore } from '../../stores/settings'
import HeroAvatar from '../common/HeroAvatar.vue'
import HudPanel from '../common/HudPanel.vue'
import InfoTooltip from '../common/InfoTooltip.vue'
import MatchDetailsDialog from './MatchDetailsDialog.vue'
import { relativeTime } from './format'

const profile = useProfileStore()
const settings = useSettingsStore()
const text = useGameText()
const { t } = text

const selected = ref<MatchRecord | null>(null)

/** Copies of the best hero share its id; only the first one gets the crown. */
const mvpIndex = (match: MatchRecord) => match.lineup.findIndex((hero) => hero.heroId === match.mvp)
</script>

<template>
  <HudPanel :title="t('profile.history.title')" class="panel">
    <ol class="matches">
      <li
        v-for="match in profile.profile.recent"
        :key="match.id"
        class="match"
        :class="match.verdict"
        @click="selected = match"
      >
        <div class="verdict">
          <button type="button" class="open" aria-haspopup="dialog" :title="t('matchDetails.open')">
            <strong>{{ t(`result.${match.verdict}`) }}</strong>
          </button>
        </div>

        <div class="delta">
          <span
            v-if="isRated(match)"
            class="rating"
            :class="{
              up: match.ratingAfter > match.ratingBefore,
              down: match.ratingAfter < match.ratingBefore,
            }"
          >
            {{ text.signed(match.ratingAfter - match.ratingBefore) }}
          </span>

          <span class="muted">+{{ text.number(match.xp) }} {{ t('profile.progress.xp') }}</span>
        </div>

        <div class="team">
          <ul class="lineup">
            <li v-for="(hero, i) in match.lineup" :key="i">
              <Crown
                v-if="i === mvpIndex(match)"
                :size="12"
                class="crown"
                :aria-label="t('profile.history.mvp')"
              />

              <InfoTooltip>
                <HeroAvatar :hero-id="hero.heroId" :stars="hero.stars" :size="28" />
                <template #content>{{ text.heroName(hero.heroId) }}</template>
              </InfoTooltip>
            </li>
          </ul>
        </div>

        <div class="meta">
          <span>
            {{ t('profile.stats.rounds', { n: match.rounds }, match.rounds) }} ·
            {{ t('profile.history.rounds', { won: match.roundsWon, lost: match.roundsLost }) }}
          </span>

          <span class="muted">
            <template v-if="match.duel">
              <Swords :size="12" class="duel" aria-hidden="true" />
              {{ t('matchDetails.against', { name: match.duel.opponentName || t('profile.defaultName') }) }}
            </template>

            <template v-else>{{ t(`settings.difficulties.${match.difficulty}`) }}</template>
            ·
            <time :datetime="match.playedAt">{{ relativeTime(match.playedAt, settings.locale) }}</time>
          </span>
        </div>

        <ChevronRight :size="18" class="chevron" aria-hidden="true" />
      </li>
    </ol>

    <MatchDetailsDialog v-model="selected" />
  </HudPanel>
</template>

<style scoped>
.panel {
  padding: 16px 18px;
}

.matches {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.match {
  --verdict: var(--chalk-faint);
  display: grid;
  grid-template-columns: 150px 90px minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 8px 18px;
  padding: 10px 10px 10px 16px;
  border-radius: 10px;
  background: linear-gradient(90deg, color-mix(in srgb, var(--verdict) 12%, transparent), transparent 40%);
  border-left: 3px solid var(--verdict);
  cursor: pointer;
  transition: background-color 0.15s;
}

.match:hover,
.match:has(.open:focus-visible) {
  background-color: rgba(255, 255, 255, 0.04);
}

.match:has(.open:focus-visible) {
  outline: 2px solid var(--gold);
  outline-offset: 2px;
}

.open {
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.open:focus-visible {
  outline: none;
}

.chevron {
  color: var(--chalk-faint);
  transition:
    color 0.15s,
    translate 0.15s;
}

.match:hover .chevron {
  color: var(--chalk);
  translate: 2px 0;
}

.win {
  --verdict: var(--heal);
}

.loss {
  --verdict: var(--theirs);
}

.verdict {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.verdict strong {
  color: var(--verdict);
  font-size: 15px;
}

.muted {
  font-size: 12px;
  color: var(--chalk-dim);
}

.delta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-variant-numeric: tabular-nums;
}

.rating {
  font-size: 16px;
  font-weight: 800;
  color: var(--chalk-dim);
}

.rating.up {
  color: var(--heal);
}

.rating.down {
  color: var(--theirs);
}

.duel {
  vertical-align: -1px;
}

.team {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 18px;
  min-width: 0;
}

.lineup {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.lineup {
  padding-bottom: 6px;
}

.lineup li {
  position: relative;
  display: grid;
}

.crown {
  position: absolute;
  top: -9px;
  left: 50%;
  translate: -50% 0;
  z-index: 1;
  color: var(--gold);
  filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.8));
}

.meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  font-size: 13px;
  text-align: right;
}

@media (max-width: 720px) {
  .match {
    grid-template-columns: 1fr auto;
  }

  .team {
    grid-column: 1 / -1;
  }

  .meta {
    grid-column: 1 / -1;
    align-items: flex-start;
    text-align: left;
  }

  .chevron {
    display: none;
  }
}
</style>
