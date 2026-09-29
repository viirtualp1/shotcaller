<script setup lang="ts">
import { Swords } from 'lucide-vue-next'
import { DialogContent, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from 'reka-ui'
import { computed } from 'vue'
import { HERO_IDS } from '@/content/ids'
import { useGameText } from '../../composables/useGameText'
import { useModal } from '../../composables/useModal'
import { useDuelStore } from '../../stores/duel'
import { useMatchStore } from '../../stores/match'
import ModeMap from '../modes/ModeMap.vue'
import CoachAvatar from '../profile/CoachAvatar.vue'

/** A friend's challenge, shown wherever the player is; it has to be answered or left to expire. */
const duel = useDuelStore()
const match = useMatchStore()
const { t } = useGameText()

const invite = computed(() => duel.incoming)
const name = computed(() => invite.value?.opponent.name || t('profile.defaultName'))
const hero = computed(() => HERO_IDS.find((id) => id === invite.value?.opponent.avatar) ?? 'spearman')
/** Accepting leaves a match against the computer, which stays saved. */
useModal(() => invite.value !== null)

const leavesSolo = computed(() => match.view !== null && !match.isDuel)
</script>

<template>
  <DialogRoot :open="invite !== null">
    <DialogPortal>
      <DialogOverlay class="overlay" />

      <DialogContent
        class="sheet invite"
        :aria-describedby="undefined"
        @interact-outside.prevent
        @escape-key-down="duel.answer(false)"
      >
        <span class="badge"><Swords :size="22" /></span>

        <DialogTitle class="hand title">{{ t('duel.invitedTitle') }}</DialogTitle>

        <div class="who">
          <CoachAvatar :hero-id="hero" :photo="invite?.opponent.photo" :size="44" />
          <p class="text">{{ t('duel.invitedText', { name }) }}</p>
        </div>

        <p v-if="invite" class="mode">
          <ModeMap :mode="invite.duel.mode" :size="40" />
          {{ t('modes.duelMode', { mode: t(`modes.${invite.duel.mode}.name`) }) }}
        </p>

        <p v-if="leavesSolo" class="hint">{{ t('duel.invitedHint') }}</p>

        <p class="timer">{{ t('duel.expiresIn', { s: duel.inviteSecondsLeft(invite) }) }}</p>

        <div class="actions">
          <button type="button" class="btn ghost" @click="duel.answer(false)">{{ t('duel.decline') }}</button>

          <button type="button" class="btn primary" @click="duel.answer(true)">
            <Swords :size="16" /> {{ t('duel.accept') }}
          </button>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style scoped>
.mode {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  font-weight: 600;
}

.invite {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  width: min(380px, calc(100vw - 32px));
  text-align: center;
  z-index: 60;
}

.badge {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: rgba(244, 197, 91, 0.16);
  color: var(--gold);
}

.title {
  margin: 0;
  font-size: 32px;
  line-height: 1;
}

.who {
  display: flex;
  align-items: center;
  gap: 12px;
}

.text {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  text-align: left;
  overflow-wrap: anywhere;
}

.hint,
.timer {
  margin: 0;
  font-size: 12.5px;
  color: var(--chalk-dim);
}

.timer {
  font-variant-numeric: tabular-nums;
  color: var(--chalk-faint);
}

.actions {
  display: flex;
  gap: 10px;
  margin-top: 4px;
}
</style>
