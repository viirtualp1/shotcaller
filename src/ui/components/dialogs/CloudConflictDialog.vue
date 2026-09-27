<script setup lang="ts">
import { Cloud, Smartphone } from 'lucide-vue-next'
import {
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from 'reka-ui'
import { computed } from 'vue'
import { avatarOf, type Profile } from '@/domain/profile/Profile'
import { levelFor, rankFor } from '@/domain/profile/progression'
import { useGameText } from '../../composables/useGameText'
import { useCloudStore } from '../../stores/cloud'
import CoachAvatar from '../profile/CoachAvatar.vue'
import RankMedal from '../profile/RankMedal.vue'

const cloud = useCloudStore()
const { t } = useGameText()

const open = computed({
  get: () => cloud.conflict !== null && !cloud.conflictDeferred,
  set: (value: boolean) => {
    if (!value) {
      cloud.conflictDeferred = true
    }
  },
})

const summary = (profile: Profile) => ({
  name: profile.name || t('profile.defaultName'),
  avatar: avatarOf(profile),
  level: levelFor(profile.xp).level,
  rank: rankFor(profile.rating),
  matches: profile.totals.matches,
})

const sides = computed(() => {
  const conflict = cloud.conflict
  if (!conflict) {
    return []
  }

  return [
    {
      keep: 'cloud' as const,
      icon: Cloud,
      label: t('cloud.conflict.cloud'),
      action: t('cloud.conflict.keepCloud'),
      ...summary(conflict.cloud.profile),
    },
    {
      keep: 'device' as const,
      icon: Smartphone,
      label: t('cloud.conflict.device'),
      action: t('cloud.conflict.keepDevice'),
      ...summary(conflict.local),
    },
  ]
})
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay class="overlay menu-overlay" />

      <DialogContent class="sheet conflict">
        <DialogTitle class="title hand">{{ t('cloud.conflict.title') }}</DialogTitle>
        <DialogDescription class="text">{{ t('cloud.conflict.text') }}</DialogDescription>

        <div class="sides">
          <article v-for="side in sides" :key="side.keep" class="side">
            <span class="eyebrow label"><component :is="side.icon" :size="14" /> {{ side.label }}</span>

            <div class="who">
              <CoachAvatar :hero-id="side.avatar" :level="side.level" :size="48" />

              <div>
                <strong>{{ side.name }}</strong>

                <span class="muted">
                  {{ t(`profile.ranks.${side.rank.tier}`) }} ·
                  {{ t('cloud.conflict.matches', { n: side.matches }, side.matches) }}
                </span>
              </div>

              <RankMedal :tier="side.rank.tier" :stars="side.rank.stars" :size="40" />
            </div>

            <button
              type="button"
              class="btn block big"
              :class="{ primary: side.keep === 'cloud' }"
              :disabled="cloud.busy"
              @click="cloud.resolve(side.keep)"
            >
              {{ side.action }}
            </button>
          </article>
        </div>

        <button type="button" class="btn ghost block" @click="open = false">
          {{ t('cloud.conflict.later') }}
        </button>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style scoped>
.conflict {
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: min(640px, calc(100vw - 32px));
}

.title {
  font-size: 34px;
  line-height: 1;
}

.text {
  margin: 0;
  color: var(--chalk-dim);
}

.sides {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 10px;
}

.side {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  border-radius: 12px;
  border: 1px solid var(--edge);
  background: rgba(10, 15, 13, 0.35);
}

.label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.who {
  display: flex;
  align-items: center;
  gap: 12px;
}

.who > div {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.muted {
  font-size: 12.5px;
  color: var(--chalk-dim);
}
</style>
