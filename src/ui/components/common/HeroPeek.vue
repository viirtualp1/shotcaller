<script setup lang="ts">
import { BowArrow, Shield, Sword, Timer } from '@lucide/vue'
import { computed } from 'vue'
import { previewHeroVitals, type HeroVitals } from '@/application/heroVitals'
import { HEROES } from '@/content/heroes'
import type { HeroId, ItemId, RoleId, StarLevel, SynergyId } from '@/content/ids'
import { starsLabel, useGameText } from '../../composables/useGameText'
import HeroResources from './HeroResources.vue'
import ItemIcon from './ItemIcon.vue'

const props = withDefaults(
  defineProps<{
    heroId: HeroId
    stars: StarLevel
    items?: readonly ItemId[]
    synergies?: readonly SynergyId[]
    vitals?: HeroVitals | null
    role?: RoleId
    souls?: number
  }>(),
  {
    items: () => [],
    synergies: () => [],
    vitals: null,
    role: undefined,
    souls: 0,
  },
)

const text = useGameText()
const { t } = text

const hero = computed(() => HEROES[props.heroId])
const values = computed(() => props.vitals ?? previewHeroVitals(props))

const stats = computed(() => [
  {
    icon: Sword,
    label: t('card.stats.damage'),
    value: text.number(Math.round(values.value.damage)),
  },
  {
    icon: Timer,
    label: t('card.stats.attackTime'),
    value: t('card.seconds', { n: text.precise(values.value.attackInterval) }),
  },
  {
    icon: Shield,
    label: t('card.stats.armor'),
    value: `${text.number(Math.round(values.value.protection * 100))}%`,
  },
  {
    icon: BowArrow,
    label: t('card.peek.range'),
    value: hero.value.stats.range ? text.number(hero.value.stats.range) : t('card.melee'),
  },
])
</script>

<template>
  <div class="hero-peek">
    <header>
      <strong
        >{{ text.heroName(heroId) }} <span class="stars">{{ starsLabel(stars) }}</span></strong
      >

      <span class="role">{{ text.heroRoleName(heroId, role) }} · {{ text.abilityName(hero.ability) }}</span>
    </header>

    <HeroResources :values="values" :live="Boolean(vitals)" />

    <dl class="stats">
      <div v-for="stat in stats" :key="stat.label">
        <dt><component :is="stat.icon" :size="12" /> {{ stat.label }}</dt>
        <dd>{{ stat.value }}</dd>
      </div>
    </dl>

    <div v-if="items.length" class="items" :aria-label="t('shop.items')">
      <ItemIcon v-for="(item, index) in items" :key="`${item}-${index}`" :item-id="item" :size="30" />
    </div>
  </div>
</template>

<style scoped>
.hero-peek {
  width: 272px;
  max-width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
header {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
header strong {
  font-size: 15px;
}
.stars {
  color: var(--gold);
}
.role {
  font-size: 12px;
  color: var(--chalk-dim);
}
.stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 7px 12px;
  margin: 0;
  padding-top: 8px;
  border-top: 1px solid var(--edge);
}
.stats > div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 5px;
}
dt {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--chalk-dim);
  font-size: 12px;
}
dd {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.items {
  display: flex;
  gap: 6px;
  padding-top: 1px;
}
</style>
