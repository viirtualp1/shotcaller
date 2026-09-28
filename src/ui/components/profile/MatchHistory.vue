<script setup lang="ts">
import { Crown } from 'lucide-vue-next'
import { computed } from 'vue'
import type { MatchSummary } from '@/application/social/friends'
import { useGameText } from '../../composables/useGameText'
import { useProfileStore } from '../../stores/profile'
import { useSettingsStore } from '../../stores/settings'
import HeroAvatar from '../common/HeroAvatar.vue'
import HudPanel from '../common/HudPanel.vue'
import { relativeTime } from './format'

/** The player's own matches, or `matches` from a friend's profile. */
const props = defineProps<{ matches?: readonly MatchSummary[] }>()

const profile = useProfileStore()
const settings = useSettingsStore()
const text = useGameText()
const { t } = text

/** Copies of the best hero share its id; only the first one gets the crown. */
const mvpIndex = (match: MatchSummary) => match.lineup.findIndex((hero) => hero.heroId === match.mvp)

const shown = computed(() => props.matches ?? profile.profile.recent)

const signed = (value: number) =>
  value > 0 ? `+${text.number(value)}` : value < 0 ? `−${text.number(-value)}` : '0'
</script>

<template>
  <HudPanel :title="t('profile.history.title')" class="panel">
    <ol class="matches">
      <li v-for="match in shown" :key="match.id" class="match" :class="match.verdict">
        <div class="verdict">
          <strong>{{ t(`result.${match.verdict}`) }}</strong>
        </div>

        <div class="delta">
          <span
            class="rating"
            :class="{
              up: match.ratingAfter > match.ratingBefore,
              down: match.ratingAfter < match.ratingBefore,
            }"
          >
            {{ signed(match.ratingAfter - match.ratingBefore) }}
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

              <HeroAvatar :hero-id="hero.heroId" :stars="hero.stars" :size="28" />
            </li>
          </ul>
        </div>

        <div class="meta">
          <span>
            {{ t('profile.stats.rounds', { n: match.rounds }, match.rounds) }} ·
            {{ t('profile.history.rounds', { won: match.roundsWon, lost: match.roundsLost }) }}
          </span>

          <span class="muted">
            {{ t(`settings.difficulties.${match.difficulty}`) }} ·
            <time :datetime="match.playedAt">{{ relativeTime(match.playedAt, settings.locale) }}</time>
          </span>
        </div>
      </li>
    </ol>
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
  grid-template-columns: 150px 90px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px 18px;
  padding: 10px 14px 10px 16px;
  border-radius: 10px;
  background: linear-gradient(90deg, color-mix(in srgb, var(--verdict) 12%, transparent), transparent 40%);
  border-left: 3px solid var(--verdict);
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
}
</style>
