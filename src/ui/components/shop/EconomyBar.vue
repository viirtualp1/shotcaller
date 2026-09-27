<script setup lang="ts">
import { ChevronsUp, RefreshCw } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'
import { ECONOMY } from '@/content/rules'
import { useGameText } from '../../composables/useGameText'
import { useMatchStore } from '../../stores/match'
import AnimatedNumber from '../common/AnimatedNumber.vue'

const store = useMatchStore()
const { t } = useGameText()
const human = computed(() => store.view!.human)
const locked = computed(() => !store.isPlanning)

const levelLabel = computed(() =>
  t('shop.level', {
    level: human.value.level,
    capacity: human.value.boardCapacity,
  }),
)

const xpRatio = computed(() => (human.value.isMaxLevel ? 1 : human.value.xp / human.value.xpToNext))
const levelUp = ref(false)

watch(
  () => human.value.level,
  (level, previous) => {
    if (previous === undefined || level <= previous) {
      return
    }

    levelUp.value = false
    requestAnimationFrame(() => (levelUp.value = true))
  },
)
</script>

<template>
  <div class="economy" data-tour="economy">
    <div class="stats">
      <span class="gold"><span class="coin" /> <AnimatedNumber :value="human.gold" /></span>

      <span class="level" :class="{ levelUp }" @animationend="levelUp = false">
        <span class="label">{{ levelLabel }}</span>
        <span class="xp"><i :style="{ width: `${xpRatio * 100}%` }" /></span>

        <span class="hint">
          {{ human.isMaxLevel ? t('shop.maxLevel') : t('shop.xp', { xp: human.xp, next: human.xpToNext }) }}
        </span>
      </span>
    </div>

    <div class="buttons">
      <button
        type="button"
        class="btn"
        :disabled="locked || human.gold < ECONOMY.rerollCost"
        title="D"
        @click="store.reroll()"
      >
        <RefreshCw :size="15" />
        {{ t('shop.reroll') }}
        <span class="price"><span class="coin" /> {{ ECONOMY.rerollCost }}</span>
      </button>

      <button
        type="button"
        class="btn"
        :disabled="locked || human.isMaxLevel || human.gold < ECONOMY.xpCost"
        title="F"
        @click="store.buyXp()"
      >
        <ChevronsUp :size="15" />
        {{ t('shop.buyXp', { xp: ECONOMY.xpPerPurchase }) }}
        <span class="price"><span class="coin" /> {{ ECONOMY.xpCost }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.economy {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stats {
  display: flex;
  align-items: center;
  gap: 14px;
}

.gold {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 26px;
  font-weight: 800;
  color: var(--gold);
  text-shadow: 0 0 14px rgba(244, 197, 91, 0.35);
}

.level {
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex: 1;
  font-size: 12px;
}

.label {
  font-weight: 700;
}

.xp {
  height: 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.1);
  overflow: hidden;
}

.xp i {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, #6f9dff, var(--mana));
  transition: width 0.45s ease-out;
}

.hint {
  font-size: 11px;
  color: var(--chalk-dim);
}

.levelUp {
  animation: level-up 0.8s ease-out;
}

.buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.buttons .btn {
  padding: 6px 8px;
  font-size: 12px;
  white-space: nowrap;
}

.price {
  color: var(--gold);
  font-variant-numeric: tabular-nums;
}

@keyframes level-up {
  30% {
    transform: scale(1.08);
    filter: drop-shadow(0 0 10px var(--mana));
  }
}
</style>
