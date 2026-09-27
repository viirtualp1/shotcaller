<script setup lang="ts">
import { X } from 'lucide-vue-next'
import { computed } from 'vue'
import { useGameText } from '../../composables/useGameText'
import { useMatchStore } from '../../stores/match'
import HeroAvatar from '../common/HeroAvatar.vue'
import HeroDetails from '../common/HeroDetails.vue'
import ItemIcon from '../common/ItemIcon.vue'

const store = useMatchStore()
const text = useGameText()
const { t } = text
const located = computed(() => store.selected ?? store.inspected)
/** Opponent heroes are shown read-only: no selling, benching or item management. */
const enemy = computed(() => !store.selected && store.inspected !== null)
</script>

<template>
  <Transition name="rise">
    <aside v-if="located" :key="located.hero.uid" class="card" :class="{ enemy }" aria-live="polite">
      <HeroAvatar :hero-id="located.hero.heroId" :stars="located.hero.stars" :size="52" class="portrait" />

      <div class="body">
        <span v-if="enemy" class="side">{{ t('card.enemy') }}</span>

        <HeroDetails
          v-if="enemy"
          :hero-id="located.hero.heroId"
          :stars="located.hero.stars"
          :items="located.hero.items"
        />

        <HeroDetails v-else :hero-id="located.hero.heroId" :stars="located.hero.stars" />

        <div v-if="!enemy" class="items">
          <span class="label">{{ t('card.items') }}</span>

          <button
            v-for="(item, i) in located.hero.items"
            :key="`${item}-${i}`"
            type="button"
            class="item"
            :title="`${text.itemName(item)}: ${text.itemDescription(item)}`"
            :disabled="!store.isPlanning"
            @click="store.unequip(located.hero.uid, i)"
          >
            <ItemIcon :item-id="item" :size="26" />
            <span>{{ t('card.unequip') }}</span>
          </button>

          <span v-if="!located.hero.items.length" class="hint">{{ t('card.noItems') }}</span>
        </div>

        <div v-if="!enemy" class="actions">
          <button
            v-if="located.slot !== 'bench'"
            type="button"
            class="btn"
            :disabled="!store.isPlanning"
            @click="store.move(located.hero.uid, 'bench')"
          >
            {{ t('card.toBench') }}
          </button>

          <button
            type="button"
            class="btn danger"
            :disabled="!store.isPlanning"
            @click="store.sell(located.hero.uid)"
          >
            {{ t('card.sell', { gold: located.hero.sellValue }) }} <kbd>E</kbd>
          </button>
        </div>
      </div>

      <button
        type="button"
        class="close icon-btn"
        :aria-label="t('card.close')"
        @click="store.clearSelection()"
      >
        <X :size="16" />
      </button>
    </aside>
  </Transition>
</template>

<style scoped>
.card {
  position: relative;
  display: flex;
  gap: 14px;
  width: min(460px, calc(100vw - 32px));
  padding: 14px 16px;
  border-radius: 14px;
  background: rgba(17, 24, 21, 0.95);
  border: 1px solid rgba(244, 197, 91, 0.45);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(6px);
  font-size: 13px;
}

.card.enemy {
  border-color: rgba(255, 112, 96, 0.5);
}

.side {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--theirs);
}

.portrait {
  margin-top: 4px;
}

.body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  flex: 1;
}

.items {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--chalk-dim);
}

.item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 8px 2px 2px;
  border-radius: 8px;
  border: 1px solid var(--edge);
  background: transparent;
  font-size: 11px;
  cursor: pointer;
}

.item:hover:not(:disabled) {
  border-color: var(--edge-strong);
}

.hint {
  font-size: 11px;
  color: var(--chalk-faint);
}

.actions {
  display: flex;
  gap: 8px;
}

.danger:hover:not(:disabled) {
  border-color: var(--theirs);
  color: var(--theirs);
}

.close {
  position: absolute;
  top: 8px;
  right: 8px;
}
</style>
