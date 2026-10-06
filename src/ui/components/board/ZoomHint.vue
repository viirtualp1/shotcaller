<script setup lang="ts">
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from 'reka-ui'
import { Pointer, X } from '@lucide/vue'
import { useGameText } from '../../composables/useGameText'
import { useZoomHint } from '../../composables/useZoomHint'
import ModeMap from '../modes/ModeMap.vue'
import { useMatchStore } from '../../stores/match'
import { useModal } from '../../composables/useModal'

const match = useMatchStore()
const hint = useZoomHint()
const { t } = useGameText()
useModal(() => hint.open)
</script>

<template>
  <DialogRoot :open="hint.open" @update:open="hint.close">
    <DialogPortal>
      <DialogOverlay class="overlay" />

      <DialogContent class="sheet zoom-hint">
        <DialogClose class="icon-btn close" :aria-label="t('coach.close')"><X :size="18" /></DialogClose>

        <div class="demo" aria-hidden="true">
          <div class="map"><ModeMap :mode="match.view?.mode ?? 'threeLanes'" :size="190" /></div>
          <Pointer class="finger first" :size="42" />
          <Pointer class="finger second" :size="42" />
        </div>

        <DialogTitle class="hand">{{ t('zoomHint.title') }}</DialogTitle>
        <DialogDescription>{{ t('zoomHint.text') }}</DialogDescription>
        <DialogClose class="btn primary">{{ t('zoomHint.done') }}</DialogClose>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style scoped>
.zoom-hint {
  width: min(380px, calc(100vw - 32px));
  text-align: center;
}
.close {
  position: absolute;
  top: 10px;
  right: 10px;
}
.hand {
  margin: 12px 0;
  font-size: 34px;
  color: var(--gold);
}
p {
  color: var(--chalk-dim);
  line-height: 1.6;
}
.demo {
  position: relative;
  width: 220px;
  height: 190px;
  margin: 16px auto;
  overflow: hidden;
  border-radius: var(--radius);
  background: var(--board);
}
.map {
  display: grid;
  place-items: center;
  animation: demo-zoom 1.8s ease-in-out 2;
}
.finger {
  position: absolute;
  top: 96px;
  color: var(--gold);
  filter: drop-shadow(0 2px 3px #000);
}
.first {
  left: 60px;
  animation: finger-left 1.8s ease-in-out 2;
}
.second {
  right: 60px;
  animation: finger-right 1.8s ease-in-out 2;
}
@keyframes demo-zoom {
  0%,
  100% {
    transform: scale(1);
  }
  45%,
  65% {
    transform: scale(1.5);
  }
}
@keyframes finger-left {
  0%,
  100% {
    transform: translateX(0);
  }
  45%,
  65% {
    transform: translateX(-32px);
  }
}
@keyframes finger-right {
  0%,
  100% {
    transform: translateX(0);
  }
  45%,
  65% {
    transform: translateX(32px);
  }
}
@media (prefers-reduced-motion: reduce) {
  .map,
  .finger {
    animation: none;
  }
}
</style>
