<script setup lang="ts">
import { Bot, Swords, Target } from '@lucide/vue'
import { useGameText } from '../../composables/useGameText'
import { useDuelStore } from '../../stores/duel'
import { useMenuStore, type MatchOpponent } from '../../stores/menu'

/** One tile per kind of opponent: each opens the new match dialog already set to it. */
const QUICK_STARTS: readonly { opponent: MatchOpponent; icon: typeof Bot; label: string }[] = [
  {
    opponent: 'computer',
    icon: Bot,
    label: 'matchmaking.computer',
  },
  {
    opponent: 'online',
    icon: Swords,
    label: 'matchmaking.online',
  },
  {
    opponent: 'training',
    icon: Target,
    label: 'sandbox.tab',
  },
]

const menu = useMenuStore()
const duel = useDuelStore()
const { t } = useGameText()
</script>

<template>
  <nav class="quick" :aria-label="t('start.newMatch')">
    <button
      v-for="quick in QUICK_STARTS"
      :key="quick.opponent"
      type="button"
      class="tile"
      :disabled="duel.matchmaking"
      @click="menu.openNewMatch(quick.opponent)"
    >
      <component :is="quick.icon" :size="20" />
      <span>{{ t(quick.label) }}</span>
    </button>
  </nav>
</template>

<style scoped>
.quick {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 64px;
  padding: 8px 4px;
  border: 1px solid var(--edge);
  border-radius: var(--radius);
  background: var(--panel);
  color: var(--chalk);
  font: inherit;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  transition:
    border-color 0.15s,
    background-color 0.15s;
}

.tile svg {
  color: var(--gold);
}

.tile:hover:not(:disabled) {
  border-color: rgba(244, 197, 91, 0.5);
  background: rgba(244, 197, 91, 0.06);
}

.tile:disabled {
  opacity: 0.5;
  cursor: default;
}
</style>
