<script setup lang="ts">
import type { FeedEntry } from '@/application/battleFeed'
import type { TeamId } from '@/content/ids'
import { useGameText } from '../../composables/useGameText'
import { useMatchStore } from '../../stores/match'

const store = useMatchStore()
const text = useGameText()
const { t } = text

const teamClass = (team: TeamId) => (team === 0 ? 'ours' : 'theirs')
const killer = (entry: Extract<FeedEntry, { kind: 'kill' }>) =>
  entry.killerHero ? text.heroName(entry.killerHero) : t(`killers.${entry.killerKind}`)
</script>

<template>
  <TransitionGroup name="feed" tag="ol" class="feed" aria-live="polite">
    <li v-for="entry in [...store.feed].reverse()" :key="entry.id">
      <template v-if="entry.kind === 'kill'">
        <b :class="teamClass(entry.killerTeam)">{{ killer(entry) }}</b>
        <span class="x">✕</span>
        <b :class="teamClass(entry.killerTeam === 0 ? 1 : 0)">{{ text.heroName(entry.victim) }}</b>
      </template>
      <b v-else :class="teamClass(entry.attackerTeam)">
        {{
          entry.slot === 'throne'
            ? t('battle.throneFell')
            : t('battle.towerFell', { lane: text.slotName(entry.slot) })
        }}
      </b>
    </li>
  </TransitionGroup>
</template>

<style scoped>
.feed {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 12px;
}

.x {
  margin: 0 6px;
  color: var(--chalk-faint);
}

.ours {
  color: var(--ours);
}

.theirs {
  color: var(--theirs);
}

.feed-enter-active {
  transition:
    opacity 0.25s,
    transform 0.25s;
}

.feed-enter-from {
  opacity: 0;
  transform: translateX(16px);
}
</style>
