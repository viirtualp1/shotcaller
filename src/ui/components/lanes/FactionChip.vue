<script setup lang="ts">
import { computed } from 'vue'
import { FACTION_TIERS, FACTIONS, type FactionTier } from '@/content/factions'
import { HEROES } from '@/content/heroes'
import { HERO_IDS, type FactionId } from '@/content/ids'
import { cssColor } from '@/rendering/theme'
import { useGameText } from '../../composables/useGameText'
import { FACTION_ICONS } from '../../icons'
import HeroAvatar from '../common/HeroAvatar.vue'
import InfoTooltip from '../common/InfoTooltip.vue'

/** A faction on a lane: filled once its heroes there reach a step, dashed while one more would get them there. */
const props = defineProps<{ faction: FactionId; count: number; tier: FactionTier | null }>()

const text = useGameText()
const { t } = text

const members = computed(() => HERO_IDS.filter((id) => HEROES[id].faction === props.faction))
const next = computed(() => FACTION_TIERS.find((tier) => tier > props.count) ?? null)
</script>

<template>
  <InfoTooltip side="right" pass-through>
    <span
      class="chip anim-pop"
      :class="tier ? 'active' : 'next'"
      :style="{ '--c': cssColor(FACTIONS[faction].color) }"
    >
      <component :is="FACTION_ICONS[faction]" :size="12" aria-hidden="true" />
      <span class="label">{{ text.factionName(faction) }}</span>
      <span class="count">{{ next ? `${count}/${next}` : count }}</span>
    </span>

    <template #content>
      <div class="details">
        <strong class="title" :style="{ color: cssColor(FACTIONS[faction].color) }">
          <component :is="FACTION_ICONS[faction]" :size="14" aria-hidden="true" />
          {{ text.factionName(faction) }}
        </strong>

        <span class="lore">{{ text.factionLore(faction) }}</span>

        <ul class="steps">
          <li v-for="step in FACTION_TIERS" :key="step" :class="{ reached: tier !== null && step <= tier }">
            <span class="need">{{ step }}</span>
            <span>{{ text.factionEffect(faction, step) }}</span>
          </li>
        </ul>

        <span v-if="next" class="hint">{{ t('card.factionNeed', { count, need: next }) }}</span>

        <span class="members">
          <HeroAvatar v-for="id in members" :key="id" :hero-id="id" :size="24" />
        </span>
      </div>
    </template>
  </InfoTooltip>
</template>

<style scoped>
.chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: 100%;
  padding: 1px 8px;
  border-radius: var(--radius);
  font-size: 11px;
  font-weight: 600;
  line-height: 1.5;
  white-space: nowrap;
  cursor: help;
}

.label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.count {
  font-variant-numeric: tabular-nums;
  opacity: 0.8;
}

.chip.active {
  color: var(--ink);
  background: var(--c);
  box-shadow: 0 0 10px color-mix(in srgb, var(--c) 45%, transparent);
}

.chip.next {
  color: var(--chalk-dim);
  border: 1px dashed color-mix(in srgb, var(--c) 60%, transparent);
}

.chip.next svg {
  color: var(--c);
}

.details {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-width: 260px;
}

.title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
}

.lore {
  font-size: 12px;
  color: var(--chalk-dim);
}

.steps {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 12px;
  color: var(--chalk-dim);
}

.steps li {
  display: flex;
  gap: 8px;
}

.steps li.reached {
  color: var(--chalk);
}

.need {
  flex: none;
  display: grid;
  place-items: center;
  width: 18px;
  height: 18px;
  border-radius: 999px;
  border: 1px solid var(--edge-strong);
  font-size: 11px;
  font-weight: 700;
}

.reached .need {
  border-color: var(--gold);
  color: var(--gold);
}

.hint {
  font-size: 11.5px;
  color: var(--gold);
}

.members {
  display: flex;
  gap: 4px;
}
</style>
