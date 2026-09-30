<script setup lang="ts">
import { Axe, BowArrow, Heart, Sparkles, Sword } from '@lucide/vue'
import { computed } from 'vue'
import { HEROES } from '@/content/heroes'
import type { HeroId, ItemId, StarLevel } from '@/content/ids'
import { ROLES } from '@/content/roles'
import { STAR_POWER } from '@/content/rules'
import { cssColor } from '@/rendering/theme'
import { starsLabel, useGameText } from '../../composables/useGameText'
import { ROLE_ICONS } from '../../icons'
import ItemIcon from './ItemIcon.vue'

/** Dota-style hero sheet: identity, core stats, then ability and passives in separate blocks. */
const props = withDefaults(
  defineProps<{ heroId: HeroId; stars: StarLevel; items?: readonly ItemId[]; heading?: boolean }>(),
  {
    items: () => [],
    heading: true,
  },
)

const text = useGameText()
const { t } = text
const hero = computed(() => HEROES[props.heroId])
const power = computed(() => STAR_POWER[props.stars])
const role = computed(() => ROLES[hero.value.role])
const range = computed(() => hero.value.stats.range)
const innate = computed(() => text.heroPassive(props.heroId))
</script>

<template>
  <div class="hero-details">
    <header v-if="heading" class="heading">
      <strong class="name">{{ text.heroName(heroId) }}</strong>
      <span class="stars">{{ starsLabel(stars) }}</span>
    </header>

    <div class="meta">
      <span
        class="chip attack"
        :title="range ? t('card.ranged', { range }) : t('card.melee')"
        :aria-label="range ? t('card.ranged', { range }) : t('card.melee')"
      >
        <BowArrow v-if="range" :size="14" />
        <Axe v-else :size="14" />
      </span>

      <span class="chip role" :style="{ '--role': cssColor(role.color) }">
        <component :is="ROLE_ICONS[hero.role]" :size="13" />
        {{ text.roleName(hero.role) }}
      </span>
    </div>

    <div class="stats">
      <span class="stat hp" :title="t('card.hp')">
        <Heart :size="15" />
        {{ text.number(Math.round(hero.stats.hp * power)) }}
      </span>

      <span class="stat damage" :title="t('card.damage')">
        <Sword :size="15" />
        {{ text.number(Math.round(hero.stats.damage * power)) }}
      </span>
    </div>

    <section class="block ability">
      <span class="label">{{ t('card.ability') }}</span>

      <strong class="block-title">
        <Sparkles :size="14" />
        {{ text.abilityName(hero.ability) }}
      </strong>

      <p>{{ text.abilityDescription(hero.ability, power) }}</p>
    </section>

    <section v-if="innate" class="block innate">
      <span class="label">{{ t('card.innate') }}</span>
      <p>{{ innate }}</p>
    </section>

    <section class="block passive" :style="{ '--role': cssColor(role.color) }">
      <span class="label">{{ t('card.rolePassive', { role: text.roleName(hero.role) }) }}</span>
      <p>{{ text.rolePassive(hero.role) }}</p>
    </section>

    <ul v-if="items.length" class="items">
      <li v-for="(item, i) in items" :key="`${item}-${i}`">
        <ItemIcon :item-id="item" :size="40" />
      </li>
    </ul>
  </div>
</template>

<style scoped>
.hero-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 280px;
  max-width: 100%;
}

.heading {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.name {
  font-size: 15px;
}

.stars {
  color: var(--gold);
}

.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid var(--edge-strong);
  font-size: 11.5px;
  font-weight: 600;
  color: var(--chalk-dim);
}

.chip.role {
  border-color: color-mix(in srgb, var(--role) 55%, transparent);
  background: color-mix(in srgb, var(--role) 14%, transparent);
  color: var(--role);
}

.stats {
  display: flex;
  gap: 8px;
}

.stat {
  display: inline-flex;
  flex: 1;
  align-items: center;
  gap: 6px;
  padding: 5px 9px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.05);
  font-size: 14px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.stat.hp svg {
  color: var(--heal);
}

.stat.damage svg {
  color: #ff9a6b;
}

.block {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 7px 9px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.04);
  border-left: 2px solid var(--edge-strong);
}

.block.ability {
  border-left-color: var(--mana, #6c9cff);
}

.block.innate {
  border-left-color: var(--gold);
}

.block.passive {
  border-left-color: var(--role);
}

.label {
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--chalk-dim);
}

.block-title {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--chalk);
}

p {
  margin: 0;
  font-size: 12.5px;
  color: var(--chalk-dim);
}

.items {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}
</style>
