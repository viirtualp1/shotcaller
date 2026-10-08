<script setup lang="ts">
import { computed } from 'vue'
import { Check, LockKeyhole, Crown } from '@lucide/vue'
import { COACH_PATH } from '@/content/progression'
import { cosmeticsFor } from '@/domain/profile/cosmetics'
import { useGameText } from '../../composables/useGameText'
import { useProfileStore } from '../../stores/profile'
import CoachAvatar from './CoachAvatar.vue'
import CoachTitle from './CoachTitle.vue'
const profile = useProfileStore()
const { t } = useGameText()
const cosmetics = computed(() => cosmeticsFor(profile.profile.xp, profile.profile.cosmetics))
function equip(step: (typeof COACH_PATH)[number]) {
  if (step.reward.kind === 'frame') {
    profile.equipFrame(step.reward.id)
  } else {
    profile.equipTitle(step.reward.id)
  }
}
function worn(step: (typeof COACH_PATH)[number]) {
  return step.reward.kind === 'frame' ? cosmetics.value.frame === step.reward.id : cosmetics.value.title === step.reward.id
}
</script>
<template>
<section class="coach-path" aria-labelledby="coach-path-title">
  <header><div><span class="eyebrow">{{ t('cosmetics.eyebrow') }}</span><h2 id="coach-path-title" class="hand">{{ t('cosmetics.path') }}</h2><p>{{ t('cosmetics.intro') }}</p></div>
  <div class="identity"><CoachAvatar :hero-id="profile.avatar" :frame="cosmetics.frame" :size="60" /><CoachTitle :title="cosmetics.title" /></div></header>
  <div class="reset"><button class="btn ghost" @click="profile.equipFrame(null)">{{ t('cosmetics.clearFrame') }}</button><button class="btn ghost" @click="profile.equipTitle(null)">{{ t('cosmetics.clearTitle') }}</button></div>
  <ol class="path">
    <li v-for="step in COACH_PATH" :key="step.level">
      <button :disabled="profile.level.level < step.level" :aria-pressed="worn(step)" :class="{ worn: worn(step) }" @click="equip(step)">
        <span class="step">{{ t('profile.level', { level: step.level }) }}<LockKeyhole v-if="profile.level.level < step.level" :size="13" /><Check v-else-if="worn(step)" :size="13" /></span>
        <CoachAvatar v-if="step.reward.kind === 'frame'" hero-id="spearman" :frame="step.reward.id" :size="32" /><Crown v-else :size="30" class="crown" />
        <strong>{{ t(`cosmetics.${step.reward.kind === 'frame' ? 'frames' : 'titles'}.${step.reward.id}`) }}</strong>
        <small>{{ t(`cosmetics.${step.reward.kind}`) }}</small>
      </button>
    </li>
  </ol>
</section>
</template>
<style scoped>
.coach-path { padding: 28px; border: 1px solid var(--edge); border-radius: var(--radius); background: var(--board-deep); }
header { display: flex; align-items: center; justify-content: space-between; gap: 24px; }
h2 { margin: 6px 0; font-size: 42px; }
p { color: var(--chalk-dim); max-width: 640px; line-height: 1.6; }
.eyebrow, .crown { color: var(--gold); }
.identity { display: grid; justify-items: center; gap: 14px; padding: 12px; }
.reset { display: flex; flex-wrap: wrap; gap: 8px; margin-block: 16px; }
.path { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 10px; list-style: none; padding: 0; }
.path button { display: flex; flex-direction: column; align-items: center; justify-content: space-between; gap: 16px; width: 100%; min-height: 155px; padding: 12px; border: 1px solid var(--edge); border-radius: var(--radius); background: var(--board); color: var(--chalk); cursor: pointer; }
.path button:disabled { opacity: .5; cursor: default; }
.path button.worn { border-color: var(--gold); background: color-mix(in srgb, var(--gold) 8%, var(--board)); }
.step { display: flex; width: 100%; align-items: center; justify-content: space-between; font-size: 11px; color: var(--chalk-dim); }
.path strong { font-size: 13px; }
.path small { font-size: 11px; color: var(--chalk-dim); }
@media(max-width: 720px) { .coach-path { padding: 18px 14px; } header { align-items: flex-start; } .identity { display: none; } .path { grid-template-columns: repeat(2, minmax(0,1fr)); } }
</style>
