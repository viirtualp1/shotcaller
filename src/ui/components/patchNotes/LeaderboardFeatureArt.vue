<script setup lang="ts">
import { Trophy } from '@lucide/vue'
import { useGameText } from '../../composables/useGameText'
import HeroAvatar from '../common/HeroAvatar.vue'
import RankMedal from '../profile/RankMedal.vue'

// Fixed historical examples, not the current leaderboard.
const EXAMPLES = [
  {
    name: 'Miracle',
    hero: 'shade',
    rating: '1 520',
  },
  {
    name: 'Puppey',
    hero: 'pyromancer',
    rating: '1 480',
  },
  {
    name: 'Dendi',
    hero: 'warden',
    rating: '1 440',
  },
] as const

const { t } = useGameText()
</script>

<template>
  <div class="illustration">
    <div class="board">
      <span class="title"><Trophy :size="15" /> {{ t('leaderboard.title') }}</span>

      <div v-for="(coach, i) in EXAMPLES" :key="coach.name" class="coach">
        <b>{{ i + 1 }}</b>

        <HeroAvatar :hero-id="coach.hero" :size="28" />

        <strong>{{ coach.name }}</strong>

        <RankMedal tier="shotcaller" :size="26" />

        <span>{{ coach.rating }} <small>MMR</small></span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.illustration {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 20px;
}
.board {
  width: 100%;
  max-width: 360px;
  overflow: hidden;
  border: 1px solid #f4c55b35;
  border-radius: var(--radius);
  background: #1b2a22;
  box-shadow: 0 14px 35px #0005;
}
.title {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px;
  border-bottom: 1px solid var(--edge);
  color: var(--gold);
  font-size: 12px;
  font-weight: 800;
}
.coach {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 18px 14px;
  border-bottom: 1px solid var(--edge);
}
.coach:last-child {
  border: 0;
}
.coach b {
  width: 9px;
  color: var(--gold);
  font-size: 12px;
}
.coach strong {
  flex: 1;
  font-size: 11px;
}
.coach > span {
  font-size: 12px;
  font-weight: 800;
  white-space: nowrap;
}
.coach small {
  font-size: 8px;
  color: var(--chalk-faint);
}
@media (max-width: 380px) {
  .coach {
    gap: 7px;
    padding-inline: 10px;
  }
  .illustration {
    padding-inline: 15px;
  }
}
</style>
