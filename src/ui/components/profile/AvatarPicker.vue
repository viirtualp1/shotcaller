<script setup lang="ts">
import { Sparkles } from 'lucide-vue-next'
import { DialogClose, DialogContent, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from 'reka-ui'
import { HERO_IDS, type HeroId } from '@/content/ids'
import { useGameText } from '../../composables/useGameText'
import { useProfileStore } from '../../stores/profile'
import HeroAvatar from '../common/HeroAvatar.vue'

const open = defineModel<boolean>('open', { required: true })
const profile = useProfileStore()
const text = useGameText()
const { t } = text

function pick(heroId: HeroId | null) {
  profile.setAvatar(heroId)
  open.value = false
}
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay class="overlay" />

      <DialogContent class="sheet picker" :aria-describedby="undefined">
        <DialogTitle class="title hand">{{ t('profile.avatarTitle') }}</DialogTitle>

        <div class="grid">
          <button
            type="button"
            class="option auto"
            :aria-pressed="profile.profile.avatar === null"
            @click="pick(null)"
          >
            <span class="auto-icon"><Sparkles :size="22" /></span>
            <span class="label">{{ t('profile.avatarAuto') }}</span>
          </button>

          <button
            v-for="heroId in HERO_IDS"
            :key="heroId"
            type="button"
            class="option"
            :aria-pressed="profile.profile.avatar === heroId"
            @click="pick(heroId)"
          >
            <HeroAvatar :hero-id="heroId" :size="48" />
            <span class="label">{{ text.heroName(heroId) }}</span>
          </button>
        </div>

        <DialogClose class="btn ghost block">{{ t('profile.cancel') }}</DialogClose>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style scoped>
.picker {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: min(620px, calc(100vw - 32px));
}

.title {
  font-size: 34px;
  line-height: 1;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
  gap: 8px;
}

.option {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px 6px 10px;
  border-radius: 12px;
  border: 1px solid var(--edge);
  background: rgba(10, 15, 13, 0.35);
  cursor: pointer;
  transition:
    border-color 0.15s,
    background 0.15s;
}

.option:hover {
  border-color: var(--edge-strong);
  background: var(--panel-raised);
}

.option[aria-pressed='true'] {
  border-color: var(--gold);
  background: rgba(244, 197, 91, 0.1);
}

.auto-icon {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 2px dashed var(--edge-strong);
  color: var(--gold);
}

.label {
  font-size: 12px;
  font-weight: 600;
  text-align: center;
  line-height: 1.2;
}
</style>
