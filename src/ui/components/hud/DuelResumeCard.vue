<script setup lang="ts">
import { useTimeoutFn } from '@vueuse/core'
import { Flag, Play, Swords } from '@lucide/vue'
import { computed, ref } from 'vue'
import { useGameText } from '../../composables/useGameText'
import { useDuelStore } from '../../stores/duel'

/** A duel left unfinished: carry on with it, or give it up after a second press. */
const duel = useDuelStore()
const { t } = useGameText()
/** Giving up asks once more; the question goes away on its own. */
const confirmingForfeit = ref(false)
const rival = computed(() => duel.resumable?.opponent.name || t('profile.defaultName'))

const { start: expireForfeit } = useTimeoutFn(() => (confirmingForfeit.value = false), 3000, {
  immediate: false,
})

function forfeit() {
  if (!confirmingForfeit.value) {
    confirmingForfeit.value = true
    expireForfeit()

    return
  }

  confirmingForfeit.value = false
  void duel.forfeit()
}
</script>

<template>
  <section v-if="duel.resumable" class="duel">
    <strong class="duel-title"><Swords :size="16" /> {{ t('duel.resumeTitle', { name: rival }) }}</strong>

    <p v-if="!duel.canResume" class="duel-note">{{ t('duel.elsewhere') }}</p>

    <div class="duel-actions">
      <button v-if="duel.canResume" type="button" class="btn primary" @click="duel.resume()">
        <Play :size="16" /> {{ t('duel.resume') }}
      </button>

      <button type="button" class="btn ghost" :class="{ danger: confirmingForfeit }" @click="forfeit">
        <Flag :size="16" /> {{ confirmingForfeit ? t('duel.confirmForfeit') : t('duel.forfeit') }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.duel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px;
  border-radius: var(--radius);
  border: 1px solid rgba(244, 197, 91, 0.5);
  background: rgba(244, 197, 91, 0.08);
}

.duel-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--gold);
  overflow-wrap: anywhere;
}

.duel-note {
  margin: 0;
  font-size: 13px;
  color: var(--chalk-dim);
}

.duel-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.btn.danger {
  border-color: rgba(255, 112, 96, 0.6);
  color: var(--theirs);
}
</style>
