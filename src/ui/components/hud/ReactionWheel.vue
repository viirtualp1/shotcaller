<script setup lang="ts">
import { onClickOutside, onKeyStroke } from '@vueuse/core'
import { BellOff, Bell, Smile } from '@lucide/vue'
import { ref, useTemplateRef } from 'vue'
import { REACTIONS, type ReactionId } from '@/application/social/reactions'
import { useGameText } from '../../composables/useGameText'
import { useDuelStore } from '../../stores/duel'

/** A chat wheel for duels: a handful of reactions the opponent sees as stickers. */
const duel = useDuelStore()
const { t } = useGameText()
const open = ref(false)
const wheel = useTemplateRef<HTMLElement>('wheel')

onClickOutside(wheel, () => (open.value = false))
onKeyStroke('Escape', () => (open.value = false))

/** Items sit on a circle, the first one at the top, going clockwise. */
const place = (index: number) => {
  const angle = (index / REACTIONS.length) * 2 * Math.PI - Math.PI / 2

  return {
    left: `calc(50% + ${Math.cos(angle) * 78}px)`,
    top: `calc(50% + ${Math.sin(angle) * 78}px)`,
  }
}

function pick(reaction: ReactionId) {
  duel.react(reaction)
  open.value = false
}
</script>

<template>
  <div ref="wheel" class="reactions">
    <button
      type="button"
      class="icon-btn toggle"
      :class="{ active: open }"
      :aria-label="t('reactions.open')"
      :aria-expanded="open"
      :title="t('reactions.open')"
      @click="open = !open"
    >
      <Smile :size="18" />
    </button>

    <Transition name="wheel">
      <div v-if="open" class="wheel" role="menu" :aria-label="t('reactions.open')">
        <button
          v-for="(reaction, i) in REACTIONS"
          :key="reaction.id"
          type="button"
          class="item"
          role="menuitem"
          :style="place(i)"
          :disabled="!duel.canReact"
          :aria-label="t(`reactions.items.${reaction.id}`)"
          :title="t(`reactions.items.${reaction.id}`)"
          @click="pick(reaction.id)"
        >
          <span class="emoji">{{ reaction.emoji }}</span>
        </button>

        <button
          type="button"
          class="item mute"
          :aria-label="duel.reactionsMuted ? t('reactions.unmute') : t('reactions.mute')"
          :title="duel.reactionsMuted ? t('reactions.unmute') : t('reactions.mute')"
          @click="duel.reactionsMuted = !duel.reactionsMuted"
        >
          <BellOff v-if="duel.reactionsMuted" :size="16" />
          <Bell v-else :size="16" />
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.reactions {
  position: relative;
}

.toggle.active {
  border-color: var(--gold);
  color: var(--gold);
}

/* The wheel hangs below the button and leans left, away from the screen edge. */
.wheel {
  position: absolute;
  top: calc(100% + 124px);
  right: 50%;
  width: 0;
  height: 0;
  translate: -84px 0;
  z-index: 30;
}

.wheel::before {
  content: '';
  position: absolute;
  left: -112px;
  top: -112px;
  width: 224px;
  height: 224px;
  border-radius: 50%;
  background: rgba(12, 18, 16, 0.92);
  border: 1px solid var(--edge-strong);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.5);
}

.item {
  position: absolute;
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  margin: -23px 0 0 -23px;
  border-radius: var(--radius);
  border: 1px solid var(--edge);
  background: rgba(255, 255, 255, 0.05);
  cursor: pointer;
  transition:
    transform 0.12s,
    background 0.12s;
}

.item:not(:disabled):hover {
  transform: scale(1.15);
  background: rgba(244, 197, 91, 0.16);
}

.item:disabled {
  opacity: 0.4;
  cursor: default;
}

.emoji {
  font-size: 24px;
  line-height: 1;
}

.item.mute {
  left: 0;
  top: 0;
  color: var(--chalk-dim);
}

.wheel-enter-active,
.wheel-leave-active {
  transition:
    opacity 0.15s ease-out,
    transform 0.15s ease-out;
}

.wheel-enter-from,
.wheel-leave-to {
  opacity: 0;
  transform: scale(0.85);
}
</style>
