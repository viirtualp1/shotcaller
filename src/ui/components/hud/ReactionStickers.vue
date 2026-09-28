<script setup lang="ts">
import { reactionEmoji } from '@/application/social/reactions'
import { useGameText } from '../../composables/useGameText'
import { useDuelStore } from '../../stores/duel'

/** Reactions under the scoreboard: the player's own on their side, the opponent's on theirs. */
const duel = useDuelStore()
const { t } = useGameText()
</script>

<template>
  <TransitionGroup name="sticker" tag="div" class="stickers" aria-live="polite">
    <div
      v-for="shown in duel.reactionsShown"
      :key="shown.key"
      class="sticker"
      :class="shown.mine ? 'mine' : 'theirs'"
    >
      <span class="emoji">{{ reactionEmoji(shown.reaction) }}</span>
      <span class="label">{{ t(`reactions.items.${shown.reaction}`) }}</span>
    </div>
  </TransitionGroup>
</template>

<style scoped>
.stickers {
  position: absolute;
  top: calc(100% + 12px);
  right: 0;
  left: 0;
  height: 0;
  pointer-events: none;
}

.sticker {
  position: absolute;
  top: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.sticker.mine {
  left: 0;
}

.sticker.theirs {
  right: 0;
}

.emoji {
  font-size: 44px;
  line-height: 1;
  filter: drop-shadow(0 6px 10px rgba(0, 0, 0, 0.5));
}

.label {
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(12, 18, 16, 0.92);
  border: 1px solid var(--edge-strong);
  font-size: 12.5px;
  font-weight: 700;
  white-space: nowrap;
}

.theirs .label {
  border-color: rgba(255, 112, 96, 0.5);
}

.mine .label {
  border-color: rgba(108, 196, 255, 0.5);
}

.sticker-enter-active {
  transition:
    opacity 0.2s ease-out,
    transform 0.25s cubic-bezier(0.3, 1.6, 0.5, 1);
}

.sticker-leave-active {
  transition: opacity 0.3s ease-in;
}

.sticker-enter-from {
  opacity: 0;
  transform: scale(0.4);
}

.sticker-leave-to {
  opacity: 0;
}
</style>
