<script setup lang="ts">
import { computed } from 'vue'
import { HEROES } from '@/content/heroes'
import type { HeroId, ItemId, StarLevel } from '@/content/ids'
import { STAR_POWER } from '@/content/rules'
import { ROLES } from '@/content/roles'
import { cssColor } from '@/rendering/theme'
import { ROLE_ICONS } from '../../icons'
import { starsLabel, useGameText } from '../../composables/useGameText'
import ItemIcon from './ItemIcon.vue'

const props = withDefaults(defineProps<{ heroId: HeroId; stars: StarLevel; items?: readonly ItemId[] }>(), {
  items: () => [],
})

const text = useGameText()
const { t } = text
const hero = computed(() => HEROES[props.heroId])
const power = computed(() => STAR_POWER[props.stars])

const stats = computed(() => ({
  hp: text.number(Math.round(hero.value.stats.hp * power.value)),
  damage: text.number(Math.round(hero.value.stats.damage * power.value)),
  reach: hero.value.stats.range ? t('card.range', { range: hero.value.stats.range }) : t('card.melee'),
}))
</script>

<template>
  <div class="details">
    <div class="heading">
      <strong>{{ text.heroName(heroId) }}</strong>
      <span class="stars">{{ starsLabel(stars) }}</span>

      <span class="role" :style="{ color: cssColor(ROLES[hero.role].color) }">
        <component :is="ROLE_ICONS[hero.role]" :size="13" />
        {{ text.roleName(hero.role) }}
      </span>
    </div>

    <dl class="stats">
      <div>
        <dt>{{ t('card.hp') }}</dt>
        <dd>{{ stats.hp }}</dd>
      </div>

      <div>
        <dt>{{ t('card.damage') }}</dt>
        <dd>{{ stats.damage }}</dd>
      </div>

      <div>
        <dd>{{ stats.reach }}</dd>
      </div>
    </dl>

    <p class="ability">
      <b>{{ text.abilityName(hero.ability) }}.</b>
      {{ text.abilityDescription(hero.ability, power) }}
    </p>

    <p v-if="text.heroPassive(heroId)" class="passive">{{ text.heroPassive(heroId) }}</p>
    <p class="passive">{{ text.rolePassive(hero.role) }}</p>

    <ul v-if="items.length" class="items">
      <li v-for="(item, i) in items" :key="`${item}-${i}`">
        <ItemIcon :item-id="item" :size="22" />
        <span>{{ text.itemName(item) }}: {{ text.itemDescription(item) }}</span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.details {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-width: 300px;
}

.heading {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.stars {
  color: var(--gold);
}

.role {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
  font-size: 12px;
  font-weight: 600;
}

.stats {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 14px;
  margin: 0;
  font-size: 12px;
  color: var(--chalk-dim);
}

.stats div {
  display: flex;
  gap: 4px;
  white-space: nowrap;
}

.stats dt::after {
  content: ':';
}

.stats dd {
  margin: 0;
  color: var(--chalk);
  font-variant-numeric: tabular-nums;
}

p {
  margin: 0;
}

.passive {
  color: var(--chalk-dim);
}

.items {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 12px;
}

.items li {
  display: flex;
  align-items: center;
  gap: 6px;
}
</style>
